const path = require('path')
const chalk = require('chalk')
const { spawn, spawnSync } = require('child_process')
const config = require('./config')
const fs = require('fs-extra')
const crypto = require('crypto')
const l10nUtil = require('./l10nUtil')
const Log = require('./sync/logging')
const assert = require('assert')

const runGClient = (args, options = {}) => {
  if (config.gClientVerbose) args.push('--verbose')
  options.cwd = options.cwd || config.rootDir
  options = mergeWithDefault(options)
  options.env.GCLIENT_FILE = config.gClientFile
  util.run('gclient', args, options)
}

const mergeWithDefault = (options) => {
  return Object.assign({}, config.defaultOptions, options)
}

async function applyPatches() {
  const GitPatcher = require('./gitPatcher')
  Log.progress('Applying patches...')
  // Always detect if we need to apply patches, since user may have modified
  // either chromium source files, or .patch files manually
  const coreRepoPath = config.braveCoreDir
  const patchesPath = path.join(coreRepoPath, 'patches')
  const v8PatchesPath = path.join(patchesPath, 'v8')
  const chromiumRepoPath = config.srcDir
  const v8RepoPath = path.join(chromiumRepoPath, 'v8')
  const chromiumPatcher = new GitPatcher(patchesPath, chromiumRepoPath)
  const v8Patcher = new GitPatcher(v8PatchesPath, v8RepoPath)

  const chromiumPatchStatus = await chromiumPatcher.applyPatches()
  const v8PatchStatus = await v8Patcher.applyPatches()

  // Log status for all patches
  // Differentiate entries for logging
  v8PatchStatus.forEach(s => s.path = path.join('v8', s.path))
  const allPatchStatus = chromiumPatchStatus.concat(v8PatchStatus)
  Log.allPatchStatus(allPatchStatus, 'Chromium')

  const hasPatchError = allPatchStatus.some(p => p.error)
  Log.progress('Done applying patches.')
  // Exit on error in any patch
  if (hasPatchError) {
    Log.error('Exiting as not all patches were successful!')
    process.exit(1)
  }
}

const restoreBraveCoreGitUrlIfGitCacheEnabled = () => {
  const gitCachePath = util.runGit(config.braveCoreDir, ['config', 'cache.cachepath'], true)
  if (!gitCachePath) {
    return
  }
  const gitBraveCoreRemoteUrl = util.runGit(config.braveCoreDir, ['remote', 'get-url', 'origin'], true)
  const gitBraveCoreRemotePushUrl = util.runGit(config.braveCoreDir, ['remote', 'get-url', '--push', 'origin'], true)
  if (gitBraveCoreRemoteUrl != gitBraveCoreRemotePushUrl) {
    util.runGit(config.braveCoreDir, ['remote', 'set-url', 'origin', gitBraveCoreRemotePushUrl], true)
  }
}

const util = {

  runProcess: (cmd, args = [], options = {}) => {
    Log.command(options.cwd, cmd, args)
    return spawnSync(cmd, args, options)
  },

  run: (cmd, args = [], options = {}) => {
    const { continueOnFail, ...cmdOptions } = options
    const prog = util.runProcess(cmd, args, cmdOptions)
    if (prog.status !== 0) {
      if (!continueOnFail) {
        console.log(prog.stdout && prog.stdout.toString())
        console.error(prog.stderr && prog.stderr.toString())
        process.exit(1)
      }
    }
    return prog
  },

  runGit: (repoPath, gitArgs, continueOnFail = false) => {
    let prog = util.run('git', gitArgs, { cwd: repoPath, continueOnFail })

    if (prog.status !== 0) {
      return null
    } else {
      return prog.stdout.toString().trim()
    }
  },

  runAsync: (cmd, args = [], options = {}) => {
    let { continueOnFail, verbose, ...cmdOptions } = options
    if (verbose) {
      Log.command(cmdOptions.cwd, cmd, args)
    }
    return new Promise((resolve, reject) => {
      const prog = spawn(cmd, args, cmdOptions)
      let stderr = ''
      let stdout = ''
      prog.stderr.on('data', data => {
        stderr += data
      })
      prog.stdout.on('data', data => {
        stdout += data
      })
      prog.on('close', statusCode => {
        const hasFailed = statusCode !== 0
        if (verbose && (!hasFailed || continueOnFail)) {
          console.log(stdout)
          if (stderr) {
            console.error(stderr)
          }
        }
        if (hasFailed) {
          const err = new Error(`Program ${cmd} exited with error code ${statusCode}.`)
          err.stderr = stderr
          err.stdout = stdout
          reject(err)
          if (!continueOnFail) {
            console.log(err.message)
            console.log(stdout)
            console.error(stderr)
            process.exit(1)
          }
          return
        }
        resolve(stdout)
      })
    })
  },


  runGitAsync: function (repoPath, gitArgs, verbose = false, logError = false) {
    return util.runAsync('git', gitArgs, { cwd: repoPath, verbose, continueOnFail: true })
      .catch(err => {
        if (logError) {
          console.error(err.message)
          console.error(`Git arguments were: ${gitArgs.join(' ')}`)
          console.log(err.stdout)
          console.error(err.stderr)
        }
        return Promise.reject(err)
      })
  },

  getGitReadableLocalRef: (repoDir) => {
    return util.runGit(repoDir, ['log', '-n', '1', '--pretty=format:%h%d'], true)
  },

  buildGClientConfig: () => {
    function replacer(key, value) {
      return value;
    }

    const solutions = [
      {
        managed: "%False%",
        name: "src",
        url: config.chromiumRepo,
        custom_deps: {
          "src/third_party/WebKit/LayoutTests": "%None%",
          "src/chrome_frame/tools/test/reference_build/chrome": "%None%",
          "src/chrome_frame/tools/test/reference_build/chrome_win": "%None%",
          "src/chrome/tools/test/reference_build/chrome": "%None%",
          "src/chrome/tools/test/reference_build/chrome_linux": "%None%",
          "src/chrome/tools/test/reference_build/chrome_mac": "%None%",
          "src/chrome/tools/test/reference_build/chrome_win": "%None%"
        },
        custom_vars: {
          "checkout_pgo_profiles": config.isBraveReleaseBuild() ? "%True%" : "%False%"
        }
      },
      {
        managed: "%False%",
        name: "src/brave",
        url: config.braveCoreRepo
      }
    ]

    let cache_dir = process.env.GIT_CACHE_PATH ? ('\ncache_dir = "' + process.env.GIT_CACHE_PATH + '"\n') : '\n'

    let out = 'solutions = ' + JSON.stringify(solutions, replacer, 2)
      .replace(/"%None%"/g, "None").replace(/"%False%"/g, "False").replace(/"%True%"/g, "True") + cache_dir

    if (config.targetOS === 'android') {
      out = out + "target_os = [ 'android' ]"
    } else if (config.targetOS === 'ios') {
      out = out + "target_os = [ 'ios' ]"
    }

    fs.writeFileSync(config.defaultGClientFile, out)
  },

  calculateFileChecksum: (filename) => {
    // adapted from https://github.com/kodie/md5-file
    const BUFFER_SIZE = 8192
    const fd = fs.openSync(filename, 'r')
    const buffer = Buffer.alloc(BUFFER_SIZE)
    const md5 = crypto.createHash('md5')

    try {
      let bytesRead
      do {
        bytesRead = fs.readSync(fd, buffer, 0, BUFFER_SIZE)
        md5.update(buffer.slice(0, bytesRead))
      } while (bytesRead === BUFFER_SIZE)
    } finally {
      fs.closeSync(fd)
    }

    return md5.digest('hex')
  },

  updateBranding: () => {
    console.log('update branding...')
    const chromeComponentsDir = path.join(config.srcDir, 'components')
    const braveComponentsDir = path.join(config.braveCoreDir, 'components')
    const chromeAppDir = path.join(config.srcDir, 'chrome', 'app')
    const braveAppDir = path.join(config.braveCoreDir, 'app')
    const chromeBrowserResourcesDir = path.join(config.srcDir, 'chrome', 'browser', 'resources')
    const braveBrowserResourcesDir = path.join(config.braveCoreDir, 'browser', 'resources')
    const braveAppVectorIconsDir = path.join(config.braveCoreDir, 'vector_icons', 'chrome', 'app')
    const chromeAndroidJavaStringsTranslationsDir = path.join(config.srcDir, 'chrome', 'browser', 'ui', 'android', 'strings', 'translations')
    const braveAndroidJavaStringsTranslationsDir = path.join(config.braveCoreDir, 'browser', 'ui', 'android', 'strings', 'translations')

    let fileMap = new Set();
    const autoGeneratedBraveToChromiumMapping = Object.assign({}, l10nUtil.getAutoGeneratedBraveToChromiumMapping())
    // The following 3 entries we map to the same name, not the chromium equivalent name for copying back
    autoGeneratedBraveToChromiumMapping[path.join(braveAppDir, 'brave_strings.grd')] = path.join(chromeAppDir, 'brave_strings.grd')
    autoGeneratedBraveToChromiumMapping[path.join(braveAppDir, 'settings_brave_strings.grdp')] = path.join(chromeAppDir, 'settings_brave_strings.grdp')
    autoGeneratedBraveToChromiumMapping[path.join(braveComponentsDir, 'components_brave_strings.grd')] = path.join(chromeComponentsDir, 'components_brave_strings.grd')

    Object.entries(autoGeneratedBraveToChromiumMapping).forEach(mapping => fileMap.add(mapping))

    // Copy xtb files for:
    // brave/app/resources/chromium_strings*.xtb
    // brave/app/resources/generated_resoruces*.xtb
    // brave/components/strings/components_chromium_strings*.xtb
    // brave/browser/ui/android/strings/translations/android_chrome_strings*.xtb
    fileMap.add([path.join(braveAppDir, 'resources'), path.join(chromeAppDir, 'resources')])
    fileMap.add([path.join(braveComponentsDir, 'strings'), path.join(chromeComponentsDir, 'strings')])
    fileMap.add([braveAndroidJavaStringsTranslationsDir, chromeAndroidJavaStringsTranslationsDir])
    // By overwriting, we don't need to modify some grd files.
    fileMap.add([path.join(braveAppDir, 'theme', 'brave'), path.join(chromeAppDir, 'theme', 'brave')])
    fileMap.add([path.join(braveAppDir, 'theme', 'brave'), path.join(chromeAppDir, 'theme', 'chromium')])
    fileMap.add([path.join(braveAppDir, 'theme', 'default_100_percent', 'brave'), path.join(chromeAppDir, 'theme', 'default_100_percent', 'brave')])
    fileMap.add([path.join(braveAppDir, 'theme', 'default_200_percent', 'brave'), path.join(chromeAppDir, 'theme', 'default_200_percent', 'brave')])
    fileMap.add([path.join(braveAppDir, 'theme', 'default_100_percent', 'brave'), path.join(chromeAppDir, 'theme', 'default_100_percent', 'chromium')])
    fileMap.add([path.join(braveAppDir, 'theme', 'default_200_percent', 'brave'), path.join(chromeAppDir, 'theme', 'default_200_percent', 'chromium')])
    fileMap.add([path.join(braveAppDir, 'theme', 'default_100_percent', 'common'), path.join(chromeAppDir, 'theme', 'default_100_percent', 'common')])
    fileMap.add([path.join(braveAppDir, 'theme', 'default_200_percent', 'common'), path.join(chromeAppDir, 'theme', 'default_200_percent', 'common')])
    fileMap.add([path.join(braveComponentsDir, 'resources', 'default_100_percent'), path.join(chromeComponentsDir, 'resources', 'default_100_percent')])
    fileMap.add([path.join(braveComponentsDir, 'resources', 'default_100_percent', 'brave'), path.join(chromeComponentsDir, 'resources', 'default_100_percent', 'chromium')])
    fileMap.add([path.join(braveComponentsDir, 'resources', 'default_200_percent'), path.join(chromeComponentsDir, 'resources', 'default_200_percent')])
    fileMap.add([path.join(braveComponentsDir, 'resources', 'default_200_percent', 'brave'), path.join(chromeComponentsDir, 'resources', 'default_200_percent', 'chromium')])
    fileMap.add([path.join(braveAppVectorIconsDir, 'vector_icons', 'brave'), path.join(chromeAppDir, 'vector_icons', 'brave')])
    // Copy chrome-logo-faded.png for replacing chrome logo of welcome page with brave's on Win8.
    fileMap.add([path.join(braveBrowserResourcesDir, 'chrome-logo-faded.png'), path.join(chromeBrowserResourcesDir, 'chrome-logo-faded.png')])
    fileMap.add([path.join(braveBrowserResourcesDir, 'downloads', 'images', 'incognito_marker.svg'), path.join(chromeBrowserResourcesDir, 'downloads', 'images', 'incognito_marker.svg')])
    fileMap.add([path.join(braveBrowserResourcesDir, 'settings', 'images'), path.join(chromeBrowserResourcesDir, 'settings', 'images')])
    fileMap.add([path.join(braveBrowserResourcesDir, 'signin', 'profile_picker', 'images'), path.join(chromeBrowserResourcesDir, 'signin', 'profile_picker', 'images')])
    // Copy to make our ${branding_path_component}_behaviors.cc
    fileMap.add([path.join(config.braveCoreDir, 'chromium_src', 'chrome', 'installer', 'setup', 'brave_behaviors.cc'),
                 path.join(config.srcDir, 'chrome', 'installer', 'setup', 'brave_behaviors.cc')])
    // Replace webui CSS to use our fonts.
    fileMap.add([path.join(config.braveCoreDir, 'ui', 'webui', 'resources', 'css', 'text_defaults_md.css'),
                 path.join(config.srcDir, 'ui', 'webui', 'resources', 'css', 'text_defaults_md.css')])

    for (const [source, output] of fileMap) {
      if (!fs.existsSync(source)) {
        console.warn(`Warning: The following file-system entry was not found for copying contents to a chromium destination: ${source}. Consider removing the entry from the file-map, or investigating whether the correct source code reference is checked out.`)
        continue
      }

      let sourceFiles = []

      // get all the files if source if a directory
      if (fs.statSync(source).isDirectory()) {
        sourceFiles = util.walkSync(source)
      } else {
        sourceFiles = [source]
      }

      for (const sourceFile of sourceFiles) {
        let destinationFile = path.join(output, path.relative(source, sourceFile))

        // The destination file might be newer when updating chromium so
        // we check for an exact match on the timestamp. We use seconds instead
        // of ms because utimesSync doesn't set the times with ms precision
        if (!fs.existsSync(destinationFile) ||
            Math.floor(new Date(fs.statSync(sourceFile).mtimeMs).getTime() / 1000) !=
            Math.floor(new Date(fs.statSync(destinationFile).mtimeMs).getTime() / 1000)) {
          fs.copySync(sourceFile, destinationFile)
          // can't set the date in the past so update the source file
          // to match the newly copied destionation file
          const date = fs.statSync(destinationFile).mtime
          fs.utimesSync(sourceFile, date, date)
          console.log(sourceFile + ' copied to ' + destinationFile)
        }
      }
    }

    if (process.platform === 'darwin') {
      // Copy proper mac app icon for channel to chrome/app/theme/mac/app.icns.
      // Each channel's app icons are stored in brave/app/theme/$channel/app.icns.
      // With this copying, we don't need to modify chrome/BUILD.gn for this.
      const iconSource = path.join(braveAppDir, 'theme', 'brave', 'mac', config.channel, 'app.icns')
      const iconDest = path.join(chromeAppDir, 'theme', 'brave', 'mac', 'app.icns')
      if (!fs.existsSync(iconDest) ||
          util.calculateFileChecksum(iconSource) != util.calculateFileChecksum(iconDest)) {
        console.log('copy app icon')
        fs.copySync(iconSource, iconDest)
      }

      // Copy branding file
      let branding_file_name = 'BRANDING'
      if (config.channel)
        branding_file_name = branding_file_name + '.' + config.channel

      const brandingSource = path.join(braveAppDir, 'theme', 'brave', branding_file_name)
      const brandingDest = path.join(chromeAppDir, 'theme', 'brave', 'BRANDING')
      if (!fs.existsSync(brandingDest) ||
          util.calculateFileChecksum(brandingSource) != util.calculateFileChecksum(brandingDest)) {
        console.log('copy branding file')
        fs.copySync(brandingSource, brandingDest)
      }
    }
    if (config.targetOS === 'android') {

      let braveOverwrittenFiles = new Set();
      const removeUnlistedAndroidResources = (braveOverwrittenFiles) => {
        const suspectedDir = path.join(config.srcDir, 'chrome', 'android', 'java', 'res')

        let untrackedChromiumFiles = util.runGit(suspectedDir, ['ls-files', '--others', '--exclude-standard'], true).split('\n')
        let untrackedChromiumPaths = [];
        for (const untrackedChromiumFile of untrackedChromiumFiles) {
          untrackedChromiumPath = path.join(suspectedDir, untrackedChromiumFile)

          if (!fs.statSync(untrackedChromiumPath).isDirectory()) {
            untrackedChromiumPaths.push(untrackedChromiumPath);
          }
        }

        const isChildOf = (child, parent) => {
          const relative = path.relative(parent, child);
          return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
        }

        for (const untrackedChromiumPath of untrackedChromiumPaths) {
          if (isChildOf(untrackedChromiumPath, suspectedDir) && !braveOverwrittenFiles.has(untrackedChromiumPath)) {
            fs.removeSync(untrackedChromiumPath);
            console.log(`Deleted not listed file: ${untrackedChromiumPath}`);
          }
        }
      }

      let androidIconSet = ''
      if (config.channel === 'development') {
        androidIconSet = 'res_brave_default'
      } else if (config.channel === '') {
        androidIconSet = 'res_brave'
      } else if (config.channel === 'beta') {
        androidIconSet = 'res_brave_beta'
      } else if (config.channel === 'dev') {
        androidIconSet = 'res_brave_dev'
      } else if (config.channel === 'nightly') {
        androidIconSet = 'res_brave_nightly'
      }

      const androidIconSource = path.join(braveAppDir, 'theme', 'brave', 'android', androidIconSet)
      const androidIconDest = path.join(config.srcDir, 'chrome', 'android', 'java', 'res_chromium')
      const androidIconBaseSource = path.join(braveAppDir, 'theme', 'brave', 'android', androidIconSet + '_base')
      const androidIconBaseDest = path.join(config.srcDir, 'chrome', 'android', 'java', 'res_chromium_base')
      const androidResSource = path.join(config.braveCoreDir, 'android', 'java', 'res')
      const androidResDest = path.join(config.srcDir, 'chrome', 'android', 'java', 'res')
      const androidResTemplateSource = path.join(config.braveCoreDir, 'android', 'java', 'res_template')
      const androidResTemplateDest = path.join(config.srcDir, 'chrome', 'android', 'java', 'res_template')
      const androidContentPublicResSource = path.join(config.braveCoreDir, 'content', 'public', 'android', 'java', 'res')
      const androidContentPublicResDest = path.join(config.srcDir, 'content', 'public', 'android', 'java', 'res')
      const androidTouchtoFillResSource = path.join(config.braveCoreDir, 'browser', 'touch_to_fill', 'android', 'internal', 'java', 'res')
      const androidTouchtoFillResDest = path.join(config.srcDir, 'chrome', 'browser', 'touch_to_fill', 'android', 'internal', 'java', 'res')
      const androidToolbarResSource = path.join(config.braveCoreDir, 'browser', 'ui', 'android', 'toolbar', 'java', 'res')
      const androidToolbarResDest = path.join(config.srcDir, 'chrome', 'browser', 'ui', 'android', 'toolbar', 'java', 'res')
      const androidComponentsWidgetResSource = path.join(config.braveCoreDir, 'components', 'browser_ui', 'widget', 'android', 'java', 'res')
      const androidComponentsWidgetResDest = path.join(config.srcDir, 'components', 'browser_ui', 'widget', 'android', 'java', 'res')
      const androidComponentsStylesResSource = path.join(config.braveCoreDir, 'components', 'browser_ui', 'styles', 'android', 'java', 'res')
      const androidComponentsStylesResDest = path.join(config.srcDir, 'components', 'browser_ui', 'styles', 'android', 'java', 'res')
      const androidSafeBrowsingResSource = path.join(config.braveCoreDir, 'browser', 'safe_browsing', 'android', 'java', 'res')
      const androidSafeBrowsingResDest = path.join(config.srcDir, 'chrome', 'browser', 'safe_browsing', 'android', 'java', 'res')

      // Mapping for copying Brave's Android resource into chromium folder.
      const copyAndroidResourceMapping = {
        [androidIconSource]: [androidIconDest],
        [androidIconBaseSource]: [androidIconBaseDest],
        [androidResSource]: [androidResDest],
        [androidResTemplateSource]: [androidResTemplateDest],
        [androidContentPublicResSource]: [androidContentPublicResDest],
        [androidTouchtoFillResSource]: [androidTouchtoFillResDest],
        [androidToolbarResSource]: [androidToolbarResDest],
        [androidComponentsWidgetResSource]: [androidComponentsWidgetResDest],
        [androidComponentsStylesResSource]: [androidComponentsStylesResDest],
        [androidSafeBrowsingResSource]: [androidSafeBrowsingResDest]
      }

      console.log('copy Android app icons and app resources')
      Object.entries(copyAndroidResourceMapping).map(([sourcePath, destPaths]) => {
        let androidSourceFiles = []
        if (fs.statSync(sourcePath).isDirectory()) {
          androidSourceFiles = util.walkSync(sourcePath)
        } else {
          androidSourceFiles = [sourcePath]
        }

        for (const destPath of destPaths) {
          for (const androidSourceFile of androidSourceFiles) {
            let destinationFile = path.join(destPath, path.relative(sourcePath, androidSourceFile))
            if (!fs.existsSync(destinationFile) || util.calculateFileChecksum(androidSourceFile) != util.calculateFileChecksum(destinationFile)) {
              fs.copySync(androidSourceFile, destinationFile)
            }
            braveOverwrittenFiles.add(destinationFile);
          }
        }
      })
      removeUnlistedAndroidResources(braveOverwrittenFiles)
    }
  },

  // Chromium compares pre-installed midl files and generated midl files from IDL during the build to check integrity.
  // Generated files during the build time and upstream pre-installed files are different because we use different IDL file.
  // So, we should copy our pre-installed files to overwrite upstream pre-installed files.
  // After checking, pre-installed files are copied to gen dir and they are used to compile.
  // So, this copying in every build doesn't affect compile performance.
  updateOmahaMidlFiles: () => {
    console.log('update omaha midl files...')
    const srcDir = path.join(config.braveCoreDir, 'win_build_output', 'midl', 'google_update')
    const dstDir = path.join(config.srcDir, 'third_party', 'win_build_output', 'midl', 'google_update')
    fs.copySync(srcDir, dstDir)
  },

  // TODO(bridiver) - this should move to gn and windows should call signApp like other platforms
  signWinBinaries: () => {
    // Copy & sign only binaries for widevine sig file generation.
    // With this, create_dist doesn't trigger rebuild because original binaries is not modified.
    const dir = path.join(config.outputDir, 'signed_binaries')
    if (!fs.existsSync(dir))
      fs.mkdirSync(dir);

    fs.copySync(path.join(config.outputDir, 'brave.exe'), path.join(dir, 'brave.exe'));
    fs.copySync(path.join(config.outputDir, 'chrome.dll'), path.join(dir, 'chrome.dll'));

    util.run('python', [path.join(config.braveCoreDir, 'script', 'sign_binaries.py'), '--build_dir=' + dir])
  },

  // TODO(bridiver) - this should move to gn
  generateWidevineSigFiles: () => {
    if (process.platform !== 'win32')
      return

    const cert = config.sign_widevine_cert
    const key = config.sign_widevine_key
    const passwd = config.sign_widevine_passwd
    const sig_generator = config.signature_generator
    let src_dir = path.join(config.outputDir, 'signed_binaries')

    if (config.skip_signing || process.env.CERT === undefined || process.env.SIGNTOOL_ARGS === undefined)
      src_dir = config.outputDir

    console.log('generate Widevine sig files...')

    util.run('python', [sig_generator, '--input_file=' + path.join(src_dir, 'brave.exe'),
        '--flags=1',
        '--certificate=' + cert,
        '--private_key=' + key,
        '--output_file=' + path.join(config.outputDir, 'brave.exe.sig'),
        '--private_key_passphrase=' + passwd])
    util.run('python', [sig_generator, '--input_file=' + path.join(src_dir, 'chrome.dll'),
        '--flags=0',
        '--certificate=' + cert,
        '--private_key=' + key,
        '--output_file=' + path.join(config.outputDir, 'chrome.dll.sig'),
        '--private_key_passphrase=' + passwd])
  },

  getVisualStudioInfo: () => {
    // Determine Visual Studio path and version using Chromium's script.
    const vsToolchainPath = path.join(config.srcDir, 'build', 'vs_toolchain.py')
    // Prevent depot_tools from checking for an update.
    const depotToolsWinToolchain = process.env.DEPOT_TOOLS_WIN_TOOLCHAIN
    process.env.DEPOT_TOOLS_WIN_TOOLCHAIN = '0'
    const vsInfo = util.run('python', [vsToolchainPath, 'get_toolchain_dir']).stdout.toString()
    if (depotToolsWinToolchain) {
      process.env.DEPOT_TOOLS_WIN_TOOLCHAIN = depotToolsWinToolchain
    } else {
      delete process.env.DEPOT_TOOLS_WIN_TOOLCHAIN
    }
    const vsPath = vsInfo.split('\n', 1)[0].split('=', 2)[1].trim().replace(/"/g, '')
    const vsVersion = vsInfo.split('\n', 3)[2].split('=', 2)[1].trim().replace(/"/g, '')
    return { vsPath, vsVersion }
  },

  buildRedirectCCTool: () => {
    // Expected path to redirect-cc.exe
    const redirectCCExe = path.join(config.braveCoreDir, 'buildtools', 'win', 'redirect-cc', 'bin', 'redirect-cc.exe')
    // Only build if missing
    if (fs.existsSync(redirectCCExe)) {
      return
    }

    console.log('building redirect-cc.exe...')
    // Path to MSBuild.exe
    const { vsPath, vsVersion } = util.getVisualStudioInfo()
    let msBuild = ''
    if (vsVersion === '2017') {
      msBuild = path.join(vsPath, 'MSBuild', '15.0', 'Bin', 'MSBuild.exe')
    } else if (vsVersion === '2019') {
      msBuild = path.join(vsPath, 'MSBuild', 'Current', 'Bin', 'MSBuild.exe')
    } else {
      throw 'Error: unexpected version of Visual Studio: ' + vsVersion
    }

    // Build redirect-cc.sln
    const arch = process.arch === 'x32' ? 'x86' : process.arch
    const toolset = vsVersion === '2017' ? 'v141' : 'v142'
    const msBuildArgs = [
      path.join(config.braveCoreDir, 'buildtools', 'win', 'redirect-cc', 'redirect-cc.sln'),
      '/p:Configuration=Release',
      '/p:Platform=' + arch,
      '/p:PlatformToolset=' + toolset,
      '/verbosity:quiet'
    ]
    util.run(msBuild, msBuildArgs)
  },

  runGnGen: (options) => {
    const buildArgsStr = util.buildArgsToString(config.buildArgs())
    const buildArgsFile = path.join(config.outputDir, 'brave_build_args.txt')
    const buildNinjaFile = path.join(config.outputDir, 'build.ninja')
    const prevBuildArgs = fs.existsSync(buildArgsFile) ?
      fs.readFileSync(buildArgsFile) : undefined

    const shouldRunGnGen = config.force_gn_gen ||
      !fs.existsSync(buildNinjaFile) || !prevBuildArgs ||
      prevBuildArgs != buildArgsStr

    if (shouldRunGnGen) {
      // `gn gen` can modify args.gn even if it's failed.
      // Therefore delete the file to make sure that args.gn and
      // brave_build_args.txt are in sync.
      if (prevBuildArgs)
        fs.removeSync(buildArgsFile)

      util.run('gn', ['gen', config.outputDir, '--args="' + buildArgsStr + '"'], options)
      fs.writeFileSync(buildArgsFile, buildArgsStr)
    }
  },

  generateNinjaFiles: (options = config.defaultOptions) => {
    console.log('generating ninja files...')

    if (process.platform === 'win32') {
      util.updateOmahaMidlFiles()
      util.buildRedirectCCTool()
    }
    util.runGnGen(options)
  },

  buildTarget: (options = config.defaultOptions) => {
    console.log('building ' + config.buildTarget + '...')

    let num_compile_failure = 1
    if (config.ignore_compile_failure)
      num_compile_failure = 0

    let ninjaOpts = [
      '-C', config.outputDir, config.buildTarget,
      '-k', num_compile_failure,
      ...config.extraNinjaOpts
    ]

    if (config.use_goma) {
      const compiler_proxy_binary = path.join(config.gomaDir, util.appendExeIfWin32('compiler_proxy'))
      assert(fs.existsSync(compiler_proxy_binary), 'compiler_proxy not found at ' + config.gomaDir)
      options.env.GOMA_COMPILER_PROXY_BINARY = compiler_proxy_binary

      // This skips the auth check and make this call instant if compiler_proxy is already running.
      // If compiler_proxy is not running, it will fail to start if no valid credentials are found.
      options.env.GOMACTL_SKIP_AUTH = 1
      const gomaStartInfo = util.runProcess('goma_ctl', ['ensure_start'], options)
      delete options.env.GOMACTL_SKIP_AUTH

      if (gomaStartInfo.status !== 0) {
        const gomaLoginInfo = util.runProcess('goma_auth', ['info'], options)
        if (gomaLoginInfo.status !== 0) {
          console.log('Login required for using Goma. This is only needed once')
          util.run('goma_auth', ['login'], options)
        }
        util.run('goma_ctl', ['ensure_start'], options)
      }
      util.run('goma_ctl', ['update_hook'], options)
    }

    if (config.isCI && config.use_goma) {
      util.run('goma_ctl', ['showflags'], options)
      util.run('goma_ctl', ['stat'], options)
    }

    util.run('autoninja', ninjaOpts, options)

    if (config.isCI && config.use_goma) {
      util.run('goma_ctl', ['stat'], options)
    }
  },

  generateXcodeWorkspace: (options = config.defaultOptions) => {
    console.log('generating Xcode workspace for "' + config.xcode_gen_target + '"...')

    const args = util.buildArgsToString(config.buildArgs())
    const genScript = path.join(config.braveCoreDir, 'vendor', 'gn-project-generators', 'xcode.py')

    const genArgs = [
      'gen', config.outputDir + "_Xcode",
      '--args="' + args + '"',
      '--ide=json',
      '--json-ide-script="' + genScript + '"',
      '--filters="' + config.xcode_gen_target + '"'
    ]

    util.run('gn', genArgs, options)
  },

  lint: (options = {}) => {
    if (!options.base) {
      options.base = 'origin/master'
    }
    let cmd_options = config.defaultOptions
    cmd_options.cwd = config.braveCoreDir
    cmd_options = mergeWithDefault(cmd_options)
    util.run('vpython', [path.join(config.braveCoreDir, 'build', 'commands', 'scripts', 'lint.py'),
        '--project_root=' + config.srcDir,
        '--base_branch=' + options.base], cmd_options)
  },

  format: (options = {}) => {
    let cmd_options = config.defaultOptions
    cmd_options.cwd = config.braveCoreDir
    cmd_options = mergeWithDefault(cmd_options)
    util.run('vpython', [path.join(config.braveCoreDir, 'build', 'commands', 'scripts', 'format.py'), options.full ? '--full' : ''], cmd_options)
  },


  shouldUpdateChromium: (chromiumRef = config.getProjectRef('chrome')) => {
    const headSHA = util.runGit(config.srcDir, ['rev-parse', 'HEAD'], true)
    const targetSHA = util.runGit(config.srcDir, ['rev-parse', chromiumRef], true)
    const needsUpdate = ((targetSHA !== headSHA) || (!headSHA && !targetSHA))
    if (needsUpdate) {
      const currentRef = util.getGitReadableLocalRef(config.srcDir)
      console.log(`Chromium repo ${chalk.blue.bold('needs update')}. Target is ${chalk.italic(chromiumRef)} at commit ${targetSHA || '[missing]'} but current commit is ${chalk.italic(currentRef || '[unknown]')} at commit ${chalk.inverse(headSHA || '[missing]')}.`)
    } else {
      console.log(chalk.green.bold(`Chromium repo does not need update as it is already ${chalk.italic(chromiumRef)} at commit ${targetSHA || '[missing]'}.`))
    }
    return needsUpdate
  },

  gclientSync: (forceReset = false, cleanup = false, braveCoreRef = null, shouldCheckChromiumVersion = true, options = {}) => {
    let reset = forceReset

    // base args
    const initialArgs = ['sync', '--nohooks','--no-history']
    const chromiumArgs = ['--revision', 'src@' + config.getProjectRef('chrome')]
    const resetArgs = ['--reset', '--with_tags', '--with_branch_heads', '--upstream']

    let args = [...initialArgs]
    let didUpdateChromium = false

    if (forceReset || braveCoreRef) {
      if (!braveCoreRef) {
        // Use current branch (sync will then pull latest) or current exact hash
        // if we're not in a branch.
        braveCoreRef = util.runGit(config.braveCoreDir, ['rev-parse', '--abbrev-ref', 'HEAD'])
        if (braveCoreRef === 'HEAD') {
          // get the rev hash if we're not in a branch
          braveCoreRef = util.runGit(config.braveCoreDir, ['rev-parse', 'HEAD'])
        }
      }

      // re-checkout as the commit ref because otherwise gclient sync clobbers
      // the branch for braveCoreRef and doesn't set it to the correct commit
      // for some reason
      if (fs.existsSync(config.braveCoreDir)) {
        const braveCoreSha = util.runGit(config.braveCoreDir, ['rev-parse', 'HEAD'])
        Log.progress(`Resetting brave core to "${braveCoreSha}"...`)
        util.runGit(config.braveCoreDir, ['reset', '--hard', 'HEAD'], true)
        let checkoutResult = util.runGit(config.braveCoreDir, ['checkout', braveCoreSha], true)
        // Handle checkout failure
        if (checkoutResult === null) {
          Log.error('Could not checkout: ' + braveCoreSha)
        }
        // Checkout was successful
        Log.progress(`...brave core is now at commit ID ${braveCoreSha}`)
      }

      args = args.concat(['--revision', 'src/brave@' + braveCoreRef])
      reset = true
    }

    if (!shouldCheckChromiumVersion) {
      const chromiumNeedsUpdate = util.shouldUpdateChromium()
      if (chromiumNeedsUpdate) {
        console.warn(chalk.yellow.bold('Chromium needed update but received the flag to skip performing the update. Working directory may not compile correctly.'))
      }
    } else if (forceReset || util.shouldUpdateChromium()) {
      args = [...args, ...chromiumArgs]
      reset = true
      didUpdateChromium = true
    }

    if (forceReset) {
      args = args.concat(['--force'])
      if (cleanup) {
        // temporarily ignored until we can figure out how not to delete src/brave in the process
        // args = args.concat(['-D'])
      }
    }

    if (reset) {
      args = [...args, ...resetArgs]
    }

    runGClient(args, options)
    // When git cache is enabled, gclient sync will use a local directory as a
    // git remote url. This will break non gclient-triggered git operations, so
    // after gclient is done, we restore the remote url here.
    restoreBraveCoreGitUrlIfGitCacheEnabled()

    return {
      didUpdateChromium,
      braveCoreRef
    }
  },

  gclientRunhooks: (options = {}) => {
    Log.progress('Running gclient hooks...')
    runGClient(['runhooks'], options)
    Log.progress('Done running gclient hooks.')
  },

  runGClient: (args, options) => {
    runGClient(args, options)
  },

  applyPatches: () => {
    return applyPatches()
  },

  buildArgsToString: (buildArgs) => {
    let args = ''
    for (let arg in buildArgs) {
      let val = buildArgs[arg]
      if (typeof val === 'string') {
        val = '"' + val + '"'
      } else {
        val = JSON.stringify(val)
      }
      args += arg + '=' + val + ' '
    }
    return args.replace(/"/g,'\\"')
  },

  walkSync: (dir, filter = null, filelist = []) => {
    fs.readdirSync(dir).forEach(file => {
      if (fs.statSync(path.join(dir, file)).isDirectory()) {
        filelist = util.walkSync(path.join(dir, file), filter, filelist)
      } else if (!filter || filter.call(null, file)) {
        filelist = filelist.concat(path.join(dir, file))
      }
    })
    return filelist
  },

  appendExeIfWin32: (input) => {
    if (process.platform === 'win32')
      input += '.exe'
    return input
  }
}

module.exports = util
