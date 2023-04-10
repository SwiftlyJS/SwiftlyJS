
import chalk from "chalk"

export const enum LogLevel {
  Debug,
  Verbose,
  Info,
  Warn,
  Error,
  Fatal,
}

let currentLogLevel = 0;

export function log(level: LogLevel, message: string): void {
  let out = '';
  out += '[' + chalk.dim.blue((new Date()).toLocaleString()) + '] ';
  switch (level) {
    case LogLevel.Info:
      out += chalk.bold.yellow('info ');
      break;
    case LogLevel.Warn:
      out += chalk.bold.red('warning ');
      break;
    case LogLevel.Error:
      out += chalk.bold.red('error ');
      break;
    case LogLevel.Error:
      out += chalk.bold.red.italic('fatal ');
      break;
  }
  if (currentLogLevel > level) {
    return;
  }
  out += message;
  console.log(out);
}

export function debug(message: string): void {
  log(LogLevel.Debug, message);
}

export function verbose(message: string): void {
  log(LogLevel.Verbose, message);
}

export function info(message: string): void {
  log(LogLevel.Info, message);
}

export function warn(message: string): void {
  log(LogLevel.Warn, message);
}

export function error(message: string): void {
  log(LogLevel.Error, message);
}

export function fatal(message: string): void {
  log(LogLevel.Fatal, message);
}

