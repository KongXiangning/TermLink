use std::fs::File;
use std::io::BufWriter;
use std::path::PathBuf;

use anyhow::{Context, Result};

use codex_rollout_compat_spike::{ParseOptions, ReadMode, parse_file, report_json};

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse()?;
    let output = File::create(&args.output)
        .with_context(|| format!("create output {}", args.output.display()))?;
    let writer = BufWriter::new(output);
    let (report, mut writer) = parse_file(&args.rollout, &args.options(), writer).await?;
    std::io::Write::flush(&mut writer)?;
    println!("{}", serde_json::to_string_pretty(&report_json(&report)?)?);
    Ok(())
}

struct Args {
    rollout: PathBuf,
    output: PathBuf,
    mode: ReadMode,
    end_offset: Option<u64>,
    start_offset: Option<u64>,
    start_ordinal: u64,
    max_input_bytes: u64,
    segment_bytes: u64,
}

impl Args {
    fn parse() -> Result<Self> {
        let mut rollout = None;
        let mut output = None;
        let mut mode = ReadMode::Stream;
        let mut end_offset = None;
        let mut start_offset = None;
        let mut start_ordinal = 0;
        let mut max_input_bytes = 512 * 1024 * 1024;
        let mut segment_bytes = 2 * 1024 * 1024;
        let mut args = std::env::args().skip(1);

        while let Some(arg) = args.next() {
            match arg.as_str() {
                "--rollout" => rollout = Some(PathBuf::from(required(&mut args, &arg)?)),
                "--output" => output = Some(PathBuf::from(required(&mut args, &arg)?)),
                "--mode" => {
                    mode = parse_mode(&required(&mut args, &arg)?)?;
                }
                "--end-offset" => end_offset = Some(parse_u64(&mut args, &arg)?),
                "--start-offset" => start_offset = Some(parse_u64(&mut args, &arg)?),
                "--start-ordinal" => start_ordinal = parse_u64(&mut args, &arg)?,
                "--max-input-mib" => {
                    max_input_bytes = mib_to_bytes(parse_u64(&mut args, &arg)?)?;
                }
                "--segment-mib" => {
                    segment_bytes = mib_to_bytes(parse_u64(&mut args, &arg)?)?;
                }
                "--help" | "-h" => {
                    print_usage();
                    std::process::exit(0);
                }
                other => anyhow::bail!("unknown argument: {other}"),
            }
        }

        let rollout = rollout.context("--rollout is required")?;
        let output = output.context("--output is required")?;
        if segment_bytes == 0 {
            anyhow::bail!("--segment-mib must be greater than zero");
        }
        if matches!(mode, ReadMode::Backward | ReadMode::Forward) && end_offset.is_none() {
            anyhow::bail!("--mode {mode:?} requires --end-offset");
        }
        if mode == ReadMode::Append && start_offset.is_none() {
            anyhow::bail!("--mode append requires --start-offset");
        }

        Ok(Self {
            rollout,
            output,
            mode,
            end_offset,
            start_offset,
            start_ordinal,
            max_input_bytes,
            segment_bytes,
        })
    }

    fn options(&self) -> ParseOptions {
        ParseOptions {
            mode: self.mode,
            end_offset: self.end_offset,
            start_offset: self.start_offset,
            start_ordinal: self.start_ordinal,
            max_input_bytes: self.max_input_bytes,
            segment_bytes: self.segment_bytes,
        }
    }
}

fn required(args: &mut impl Iterator<Item = String>, flag: &str) -> Result<String> {
    args.next()
        .with_context(|| format!("{flag} requires a value"))
}

fn parse_u64(args: &mut impl Iterator<Item = String>, flag: &str) -> Result<u64> {
    required(args, flag)?
        .parse()
        .with_context(|| format!("{flag} must be an unsigned integer"))
}

fn mib_to_bytes(mib: u64) -> Result<u64> {
    mib.checked_mul(1024 * 1024)
        .context("MiB value is too large")
}

fn parse_mode(value: &str) -> Result<ReadMode> {
    match value {
        "stream" => Ok(ReadMode::Stream),
        "tail" => Ok(ReadMode::Tail),
        "backward" => Ok(ReadMode::Backward),
        "forward" => Ok(ReadMode::Forward),
        "append" => Ok(ReadMode::Append),
        _ => anyhow::bail!(
            "unsupported --mode {value}; expected stream, tail, backward, forward, or append"
        ),
    }
}

fn print_usage() {
    println!(
        "codex-rollout-compat-spike\n\n\
         Parser-only Spike using the Demo reader and Codex rollout parser.\n\n\
         Usage:\n  \
         codex-rollout-compat-spike --rollout <rollout.jsonl> --output <parsed.jsonl> [options]\n\n\
         Options:\n  \
         --mode <stream|tail|backward|forward|append>  read mode (default: stream)\n  \
         --end-offset <bytes>                         range end for backward/forward\n  \
         --start-offset <bytes>                       checkpoint offset for append\n  \
         --start-ordinal <n>                          checkpoint physical ordinal (default: 0)\n  \
         --max-input-mib <n>                          source/decode budget (default: 512)\n  \
         --segment-mib <n>                            segment size (default: 2)"
    );
}
