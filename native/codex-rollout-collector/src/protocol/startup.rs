//! Process-level startup configuration for the isolated target analyzer.
//!
//! Startup arguments are deliberately separate from the JSONL protocol.  An
//! empty argument list remains the legacy/test entrypoint; any non-empty
//! argument list must be a complete target configuration and is never
//! silently routed to the legacy runtime.

use std::{
    ffi::{OsStr, OsString},
    fmt, fs,
    path::{Component, Path, PathBuf},
};

/// Version of the process-level startup argument contract.
pub const STARTUP_CONFIG_VERSION: u32 = 1;

const STARTUP_VERSION_FLAG: &str = "--startup-config-version";
const SESSIONS_ROOT_FLAG: &str = "--sessions-root";

/// The runtime selected by process startup arguments.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StartupMode {
    /// The pre-4.5 no-argument runtime retained for legacy/test callers.
    Legacy,
    /// The explicitly configured 4.5 target runtime.
    Target(TargetStartupConfig),
}

/// Validated, process-scoped target startup context.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TargetStartupConfig {
    startup_config_version: u32,
    sessions_root: PathBuf,
}

impl TargetStartupConfig {
    pub fn startup_config_version(&self) -> u32 {
        self.startup_config_version
    }

    pub fn sessions_root(&self) -> &Path {
        &self.sessions_root
    }
}

/// Fail-closed errors produced while selecting a runtime or validating its
/// process-level root.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StartupConfigError {
    UnexpectedArgument(String),
    MissingValue(&'static str),
    DuplicateArgument(&'static str),
    MissingArgument(&'static str),
    InvalidVersion(String),
    UnsupportedVersion(u32),
    SessionsRootEmpty,
    SessionsRootMustBeAbsolute(String),
    SessionsRootEscapesRoot(String),
    SessionsRootNotDirectory(String),
    SessionsRootParentNotDirectory(String),
    SessionsRootCannotResolve { path: String, reason: String },
}

impl fmt::Display for StartupConfigError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnexpectedArgument(argument) => {
                write!(formatter, "unexpected startup argument {argument:?}")
            }
            Self::MissingValue(argument) => {
                write!(formatter, "startup argument {argument} requires a value")
            }
            Self::DuplicateArgument(argument) => {
                write!(
                    formatter,
                    "startup argument {argument} was provided more than once"
                )
            }
            Self::MissingArgument(argument) => {
                write!(formatter, "startup argument {argument} is required")
            }
            Self::InvalidVersion(version) => {
                write!(formatter, "invalid startup config version {version:?}")
            }
            Self::UnsupportedVersion(version) => {
                write!(formatter, "unsupported startup config version {version}")
            }
            Self::SessionsRootEmpty => write!(formatter, "sessions root must not be empty"),
            Self::SessionsRootMustBeAbsolute(path) => {
                write!(formatter, "sessions root must be absolute: {path:?}")
            }
            Self::SessionsRootEscapesRoot(path) => {
                write!(
                    formatter,
                    "sessions root escapes the filesystem root: {path:?}"
                )
            }
            Self::SessionsRootNotDirectory(path) => {
                write!(formatter, "sessions root is not a directory: {path:?}")
            }
            Self::SessionsRootParentNotDirectory(path) => {
                write!(
                    formatter,
                    "sessions root parent is not a directory: {path:?}"
                )
            }
            Self::SessionsRootCannotResolve { path, reason } => {
                write!(
                    formatter,
                    "sessions root cannot be resolved {path:?}: {reason}"
                )
            }
        }
    }
}

impl std::error::Error for StartupConfigError {}

/// Parse the process arguments after the executable name.
///
/// An empty list is the explicitly retained legacy/test mode.  Once any
/// argument is supplied, both target arguments are required and unknown or
/// duplicate arguments are rejected instead of falling back to legacy.
pub fn parse_startup_args<I, S>(args: I) -> Result<StartupMode, StartupConfigError>
where
    I: IntoIterator<Item = S>,
    S: Into<OsString>,
{
    let arguments = args.into_iter().map(Into::into).collect::<Vec<_>>();
    if arguments.is_empty() {
        return Ok(StartupMode::Legacy);
    }

    let mut startup_config_version = None;
    let mut sessions_root = None;
    let mut index = 0;
    while index < arguments.len() {
        let argument = &arguments[index];
        if argument.as_os_str() == OsStr::new(STARTUP_VERSION_FLAG) {
            if startup_config_version.is_some() {
                return Err(StartupConfigError::DuplicateArgument(STARTUP_VERSION_FLAG));
            }
            let value = arguments
                .get(index + 1)
                .ok_or(StartupConfigError::MissingValue(STARTUP_VERSION_FLAG))?;
            if value.as_os_str().is_empty()
                || value.to_str().is_some_and(|value| value.starts_with('-'))
            {
                return Err(StartupConfigError::MissingValue(STARTUP_VERSION_FLAG));
            }
            let value = value.to_str().ok_or_else(|| {
                StartupConfigError::InvalidVersion(value.to_string_lossy().into_owned())
            })?;
            let version = value
                .parse::<u32>()
                .map_err(|_| StartupConfigError::InvalidVersion(value.to_string()))?;
            startup_config_version = Some(version);
            index += 2;
        } else if argument.as_os_str() == OsStr::new(SESSIONS_ROOT_FLAG) {
            if sessions_root.is_some() {
                return Err(StartupConfigError::DuplicateArgument(SESSIONS_ROOT_FLAG));
            }
            let value = arguments
                .get(index + 1)
                .ok_or(StartupConfigError::MissingValue(SESSIONS_ROOT_FLAG))?;
            if value.as_os_str().is_empty()
                || value.to_str().is_some_and(|value| value.starts_with('-'))
            {
                return Err(StartupConfigError::MissingValue(SESSIONS_ROOT_FLAG));
            }
            sessions_root = Some(value.clone());
            index += 2;
        } else {
            return Err(StartupConfigError::UnexpectedArgument(
                argument.to_string_lossy().into_owned(),
            ));
        }
    }

    let startup_config_version =
        startup_config_version.ok_or(StartupConfigError::MissingArgument(STARTUP_VERSION_FLAG))?;
    if startup_config_version != STARTUP_CONFIG_VERSION {
        return Err(StartupConfigError::UnsupportedVersion(
            startup_config_version,
        ));
    }
    let sessions_root =
        sessions_root.ok_or(StartupConfigError::MissingArgument(SESSIONS_ROOT_FLAG))?;
    let sessions_root = normalize_sessions_root(Path::new(&sessions_root))?;

    Ok(StartupMode::Target(TargetStartupConfig {
        startup_config_version,
        sessions_root,
    }))
}

/// Normalize and validate the process-scoped sessions root.
///
/// Existing roots are canonicalized and must resolve to directories.  A
/// missing root is retained as a normalized absolute path so first-install
/// startup remains possible; no directory is created and no alternate root
/// is selected.  The nearest existing ancestor must still be a directory.
pub fn normalize_sessions_root(path: &Path) -> Result<PathBuf, StartupConfigError> {
    if path.as_os_str().is_empty() {
        return Err(StartupConfigError::SessionsRootEmpty);
    }
    if !path.is_absolute() {
        return Err(StartupConfigError::SessionsRootMustBeAbsolute(
            path.to_string_lossy().into_owned(),
        ));
    }

    let normalized = lexical_normalize_absolute(path)?;
    let mut probe = normalized.clone();
    let mut missing_components = Vec::new();

    loop {
        match fs::symlink_metadata(&probe) {
            Ok(metadata) => {
                let canonical =
                    canonical_directory(&probe, &metadata, missing_components.is_empty())?;
                let mut result = canonical;
                for component in missing_components.iter().rev() {
                    result.push(component);
                }
                return Ok(result);
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                let component = probe.file_name().ok_or_else(|| {
                    StartupConfigError::SessionsRootCannotResolve {
                        path: path.to_string_lossy().into_owned(),
                        reason: "no existing ancestor".to_string(),
                    }
                })?;
                missing_components.push(component.to_os_string());
                probe = probe
                    .parent()
                    .ok_or_else(|| StartupConfigError::SessionsRootCannotResolve {
                        path: path.to_string_lossy().into_owned(),
                        reason: "no parent for missing component".to_string(),
                    })?
                    .to_path_buf();
            }
            Err(error) => {
                return Err(StartupConfigError::SessionsRootCannotResolve {
                    path: path.to_string_lossy().into_owned(),
                    reason: error.to_string(),
                });
            }
        }
    }
}

fn canonical_directory(
    path: &Path,
    metadata: &fs::Metadata,
    is_requested_root: bool,
) -> Result<PathBuf, StartupConfigError> {
    let canonical =
        fs::canonicalize(path).map_err(|error| StartupConfigError::SessionsRootCannotResolve {
            path: path.to_string_lossy().into_owned(),
            reason: error.to_string(),
        })?;
    let canonical_metadata = fs::metadata(&canonical).map_err(|error| {
        StartupConfigError::SessionsRootCannotResolve {
            path: path.to_string_lossy().into_owned(),
            reason: error.to_string(),
        }
    })?;
    if !canonical_metadata.is_dir() {
        return Err(if is_requested_root || !metadata.file_type().is_symlink() {
            StartupConfigError::SessionsRootNotDirectory(path.to_string_lossy().into_owned())
        } else {
            StartupConfigError::SessionsRootParentNotDirectory(path.to_string_lossy().into_owned())
        });
    }
    Ok(canonical)
}

fn lexical_normalize_absolute(path: &Path) -> Result<PathBuf, StartupConfigError> {
    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            Component::Prefix(prefix) => normalized.push(prefix.as_os_str()),
            Component::RootDir => normalized.push(component.as_os_str()),
            Component::CurDir => {}
            Component::ParentDir => {
                if !normalized.pop() {
                    return Err(StartupConfigError::SessionsRootEscapesRoot(
                        path.to_string_lossy().into_owned(),
                    ));
                }
            }
            Component::Normal(component) => normalized.push(component),
        }
    }
    if !normalized.is_absolute() {
        return Err(StartupConfigError::SessionsRootMustBeAbsolute(
            path.to_string_lossy().into_owned(),
        ));
    }
    Ok(normalized)
}
