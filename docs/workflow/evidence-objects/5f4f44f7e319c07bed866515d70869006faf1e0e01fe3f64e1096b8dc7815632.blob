const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
    SUPPORTED_PLATFORMS,
    getReleasePlan,
    getMaterializedReleaseEntries
} = require('./release-layout');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DIST_ROOT = path.join(PROJECT_ROOT, 'dist', 'release-layout');

function parseArgs(argv) {
    const options = {
        platform: 'all'
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === '--platform') {
            options.platform = String(argv[index + 1] || '').trim().toLowerCase();
            index += 1;
        } else if (token.startsWith('--platform=')) {
            options.platform = token.slice('--platform='.length).trim().toLowerCase();
        }
    }

    return options;
}

function readPackageVersion() {
    const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return String(packageJson.version || '').trim() || '0.0.0';
}

function resolvePlatforms(platformOption) {
    if (!platformOption || platformOption === 'all') {
        return Object.keys(SUPPORTED_PLATFORMS);
    }
    if (!Object.prototype.hasOwnProperty.call(SUPPORTED_PLATFORMS, platformOption)) {
        throw new Error(`Unsupported --platform value "${platformOption}". Expected one of: all, ${Object.keys(SUPPORTED_PLATFORMS).join(', ')}`);
    }
    return [platformOption];
}

function ensureProjectFacts() {
    const requiredPaths = [
        'package.json',
        'package-lock.json',
        '.env.example',
        path.join('src', 'server.js'),
        'public'
    ];

    for (const relativePath of requiredPaths) {
        const absolutePath = path.join(PROJECT_ROOT, relativePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Required project path not found: ${relativePath}`);
        }
    }
}

function ensureOutputDir(artifactBaseName) {
    const artifactDir = path.join(DIST_ROOT, artifactBaseName);
    fs.rmSync(artifactDir, { recursive: true, force: true });
    fs.mkdirSync(artifactDir, { recursive: true });
    return artifactDir;
}

function renderContents(plan) {
    const lines = [];
    lines.push(`Artifact: ${plan.artifactName}`);
    lines.push(`Archive root: ${plan.archiveRoot}`);
    lines.push(`Build entry: ${plan.buildEntry}`);
    lines.push(`Deploy strategy: ${plan.deployStrategy}`);
    lines.push('');
    lines.push('Package contents:');
    for (const entry of plan.packageEntries) {
        const parts = [`- ${entry.path}`, `[${entry.status}]`, entry.reason];
        if (entry.step) {
            parts.push(`(step ${entry.step})`);
        }
        lines.push(parts.join(' '));
    }
    lines.push('');
    lines.push('Notes:');
    for (const note of plan.notes) {
        lines.push(`- ${note}`);
    }
    return `${lines.join('\n')}\n`;
}

function ensureParentDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function copyMaterializedEntries(outputDir, platformKey) {
    for (const entry of getMaterializedReleaseEntries(platformKey)) {
        const targetPath = path.join(outputDir, entry.target);
        if (!entry.source) {
            fs.mkdirSync(targetPath, { recursive: true });
            continue;
        }

        const sourcePath = path.join(PROJECT_ROOT, entry.source);
        if (!fs.existsSync(sourcePath)) {
            throw new Error(`Release source path not found: ${entry.source}`);
        }

        if (entry.kind === 'directory') {
            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            fs.cpSync(sourcePath, targetPath, { recursive: true });
            continue;
        }

        ensureParentDir(targetPath);
        fs.copyFileSync(sourcePath, targetPath);
    }
}

function runCommand(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: options.cwd || PROJECT_ROOT,
        stdio: 'pipe',
        encoding: 'utf8'
    });
    if (result.status !== 0) {
        const stderr = String(result.stderr || '').trim();
        const stdout = String(result.stdout || '').trim();
        const detail = stderr || stdout || `exit code ${result.status}`;
        throw new Error(`${command} ${args.join(' ')} failed: ${detail}`);
    }
}

function createArchive(plan, outputDir) {
    const archivePath = path.join(DIST_ROOT, plan.artifactName);
    fs.rmSync(archivePath, { force: true });

    if (plan.platformKey === 'win') {
        runCommand('powershell.exe', [
            '-NoProfile',
            '-ExecutionPolicy',
            'Bypass',
            '-Command',
            `Compress-Archive -LiteralPath '${outputDir.replace(/'/g, "''")}' -DestinationPath '${archivePath.replace(/'/g, "''")}' -Force`
        ], { cwd: DIST_ROOT });
        return archivePath;
    }

    const tarCommand = process.platform === 'win32' ? 'tar.exe' : 'tar';
    runCommand(tarCommand, ['-czf', archivePath, '-C', DIST_ROOT, plan.artifactBaseName], { cwd: DIST_ROOT });
    return archivePath;
}

function writePlanFiles(plan) {
    const outputDir = ensureOutputDir(plan.artifactBaseName);
    copyMaterializedEntries(outputDir, plan.platformKey);
    const manifestPath = path.join(outputDir, 'release-manifest.json');
    const contentsPath = path.join(outputDir, 'release-contents.txt');
    fs.writeFileSync(manifestPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
    fs.writeFileSync(contentsPath, renderContents(plan), 'utf8');
    const archivePath = createArchive(plan, outputDir);
    return { manifestPath, contentsPath, archivePath };
}

function printSummary(results) {
    console.log('TermLink release layout plan generated.');
    for (const result of results) {
        console.log('');
        console.log(`[${result.plan.platform}] ${result.plan.artifactName}`);
        console.log(`  build entry : ${result.plan.buildEntry}`);
        console.log(`  output dir  : ${result.plan.outputDirectory}`);
        console.log(`  manifest    : ${path.relative(PROJECT_ROOT, result.manifestPath)}`);
        console.log(`  contents    : ${path.relative(PROJECT_ROOT, result.contentsPath)}`);
        console.log(`  archive     : ${path.relative(PROJECT_ROOT, result.archivePath)}`);
    }
    console.log('');
    console.log('Aggregate entry: npm run release:build');
}

function main() {
    ensureProjectFacts();
    const version = readPackageVersion();
    const options = parseArgs(process.argv.slice(2));
    const platforms = resolvePlatforms(options.platform);
    const results = [];

    for (const platformKey of platforms) {
        const plan = getReleasePlan(version, platformKey);
        const output = writePlanFiles(plan);
        results.push({
            plan,
            ...output
        });
    }

    printSummary(results);
}

try {
    main();
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
}
