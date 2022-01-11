/* Copyright (c) 2021 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "base/command_line.h"
#include "base/containers/contains.h"
#include "base/environment.h"
#include "base/files/file_path.h"
#include "base/files/file_util.h"
#include "base/logging.h"
#include "base/no_destructor.h"
#include "base/process/launch.h"
#include "base/strings/strcat.h"
#include "base/strings/string_split.h"
#include "base/strings/string_util.h"
#include "base/strings/sys_string_conversions.h"
#include "build/build_config.h"

const base::FilePath::StringPieceType kIFlag = FILE_PATH_LITERAL("-I");
const base::FilePath::StringPieceType kBraveChromiumSrc =
    FILE_PATH_LITERAL("brave/chromium_src");
const base::FilePath::StringPieceType kGen = FILE_PATH_LITERAL("gen");
const base::FilePath::StringPieceType kCompileFileFlags[] = {
    FILE_PATH_LITERAL("-c"),
    FILE_PATH_LITERAL("/c"),
};

class RedirectCC {
 public:
  RedirectCC(int argc, const base::FilePath::CharType* const* argv)
      : argc_(argc), argv_(argv) {
    CHECK(base::GetCurrentDirectory(&cur_dir_));
  }

  static base::Environment& GetEnv() {
    static base::NoDestructor<std::unique_ptr<base::Environment>> env(
        base::Environment::Create());
    return **env;
  }

  base::FilePath GetCompilerExecutable(int* first_compiler_arg_idx) {
    if (argc_ < 2) {
      return base::FilePath();
    }

    base::FilePath executable;
    if (GetEnv().HasVar("CC_WRAPPER")) {
      std::string cc_wrapper;
      CHECK(GetEnv().GetVar("CC_WRAPPER", &cc_wrapper));
#if defined(OS_WIN)
      executable = base::FilePath(base::SysNativeMBToWide(cc_wrapper));
#else
      executable = base::FilePath(cc_wrapper);
#endif
      *first_compiler_arg_idx = 1;
    } else {
      executable = base::FilePath(argv_[1]);
      *first_compiler_arg_idx = 2;
    }

    return executable;
  }

#if defined(OS_WIN)
  // Escapes double quotes in the arg and wraps the entire arg in double quotes.
  static base::CommandLine::StringType EscapeArg(
      const base::CommandLine::StringType& arg) {
    base::CommandLine::StringType str(L"\"");
    str.append(arg);
    size_t pos = 1;
    while ((pos = str.find(L"\"", pos)) != std::string::npos) {
      str.replace(pos, 1, L"\\\"");
      pos += 2;
    }
    str.append(L"\"");
    return str;
  }

  static base::CommandLine::StringType CreateCmdLine(
      const base::CommandLine& launch_cmd_line) {
    base::CommandLine::StringType cmd_line(
        launch_cmd_line.GetProgram().value());
    bool skip_first = true;
    for (const auto& arg : launch_cmd_line.argv()) {
      if (skip_first) {
        skip_first = false;
        continue;
      }
      base::StrAppend(&cmd_line, {L" ", EscapeArg(arg)});
    }
    return cmd_line;
  }
#endif

  int Run() {
    int first_compiler_arg_idx = 0;
    const base::FilePath& compiler_executable =
        GetCompilerExecutable(&first_compiler_arg_idx);
    if (compiler_executable.empty() || first_compiler_arg_idx == 0) {
      LOG(ERROR) << "Compiler executable not found";
      return -1;
    }

    base::FilePath chromium_src_dir;
    base::FilePath brave_chromium_src_dir;

    // Find root directories first.
    for (int arg_idx = first_compiler_arg_idx; arg_idx < argc_; ++arg_idx) {
      const auto& arg = base::FilePath::StringPieceType(argv_[arg_idx]);
      if (base::StartsWith(arg, kIFlag) &&
          base::EndsWith(arg, kBraveChromiumSrc)) {
        auto dir = arg;
        dir.remove_prefix(kIFlag.size());
        brave_chromium_src_dir = base::FilePath(dir);
        dir.remove_suffix(kBraveChromiumSrc.size());
        chromium_src_dir = base::FilePath(dir);
        break;
      }
    }
    if (chromium_src_dir.empty()) {
      LOG(ERROR) << "Can't find chromium src dir";
      return -1;
    }

    base::CommandLine launch_cmd_line(compiler_executable);
    bool compile_file_found = false;

    for (int arg_idx = first_compiler_arg_idx; arg_idx < argc_; ++arg_idx) {
      const auto& arg = base::FilePath::StringPieceType(argv_[arg_idx]);
      if (!compile_file_found && base::Contains(kCompileFileFlags, arg)) {
        compile_file_found = true;
        auto path_cc = base::FilePath::StringPieceType(argv_[arg_idx + 1]);
        if (base::StartsWith(path_cc, chromium_src_dir.value())) {
          path_cc.remove_prefix(chromium_src_dir.value().size());
        } else {
          auto path_cc_parts = base::SplitStringPiece(
              path_cc, base::FilePath::kSeparators, base::KEEP_WHITESPACE,
              base::SPLIT_WANT_NONEMPTY);
          if (path_cc_parts.size() > 0 && path_cc_parts[0] == kGen) {
            path_cc.remove_prefix(path_cc_parts[0].size() + 1);
          } else if (path_cc_parts.size() > 1 && path_cc_parts[1] == kGen) {
            path_cc.remove_prefix(path_cc_parts[0].size() + 1);
            path_cc.remove_prefix(path_cc_parts[1].size() + 1);
          }
        }
        base::FilePath brave_path = brave_chromium_src_dir.Append(path_cc);
        if (base::PathExists(brave_path)) {
          launch_cmd_line.AppendArgNative(arg);
          launch_cmd_line.AppendArgPath(brave_path);
          ++arg_idx;
          continue;
        }
      }
      launch_cmd_line.AppendArgNative(arg);
    }

#if defined(OS_WIN)
    const auto& to_launch = CreateCmdLine(launch_cmd_line);
#else
    const auto& to_launch = launch_cmd_line;
#endif

    base::LaunchOptions options;
    options.wait = true;
    auto process = base::LaunchProcess(to_launch, options);
    int exit_code = -1;
    process.WaitForExit(&exit_code);
    return exit_code;
  }

 private:
  const int argc_;
  const base::FilePath::CharType* const* argv_;

  base::FilePath cur_dir_;
};

#if defined(OS_WIN)
#define main wmain
#endif
int main(int argc, base::FilePath::CharType* argv[]) {
  RedirectCC redirect_cc(argc, argv);
  return redirect_cc.Run();
}
