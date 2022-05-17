/*
Logger class for easy and aesthetically pleasing console logging | Credit to York
*/
import chalk from 'chalk';
import moment from 'moment';
import fs from 'node:fs/promises';
import path from 'node:path';
import { serializeError } from 'serialize-error';

export class Logger {
  static async log(content, type = "log") {
    const timestamp = `[${chalk.white(moment().format("YYYY-MM-DD HH:mm:ss"))}]`;
    switch (type) {
      case "log": {
        //create file first, if it does not exist
        await fs.mkdir('./' + path.relative(process.cwd(), 'log/'), { recursive: true });
        fs.appendFile('./' + path.relative(process.cwd(), 'log/log.log'), `[${moment().format("YYYY-MM-DD HH:mm:ss")}]: ${content}\n`);
        return console.log(
          `${timestamp} [${chalk.bgBlue(
            ` ${type.toUpperCase()} `
          )}]: ${content} `
        );
      }
      case "warn": {
        //create file first, if it does not exist
        await fs.mkdir('./' + path.relative(process.cwd(), 'log/'), { recursive: true });
        fs.appendFile('./' + path.relative(process.cwd(), 'log/warn.log'), `[${moment().format("YYYY-MM-DD HH:mm:ss")}]: ${content}\n`);
        return console.log(
          `${timestamp} [${chalk.black.bgYellow(
            type.toUpperCase()
          )}]: ${content} `
        );
      }
      case "error": {
        //create file first, if it does not exist
        await fs.mkdir('./' + path.relative(process.cwd(), 'log/'), { recursive: true });
        fs.appendFile('./' + path.relative(process.cwd(), 'log/error.log'), `[${moment().format("YYYY-MM-DD HH:mm:ss")}]: ${JSON.stringify(serializeError(content))}\n`);
        return console.log(
          `${timestamp} [${chalk.bgRed(type.toUpperCase())}]: ${content} `
        );
      }
      case "debug": {
        //create file first, if it does not exist
        await fs.mkdir('./' + path.relative(process.cwd(), 'log/'), { recursive: true });
        fs.appendFile('./' + path.relative(process.cwd(), 'log/debug.log'), `[${moment().format("YYYY-MM-DD HH:mm:ss")}]: ${content}\n`);
        return console.log(
          `${timestamp} [${chalk.green(type.toUpperCase())}]: ${content} `
        );
      }
      case "cmd": {
        //create file first, if it does not exist
        await fs.mkdir('./' + path.relative(process.cwd(), 'log/'), { recursive: true });
        fs.appendFile('./' + path.relative(process.cwd(), 'log/cmd.log'), `[${moment().format("YYYY-MM-DD HH:mm:ss")}]: ${content}\n`);
        return console.log(
          `${timestamp} [${chalk.black.bgWhite(
            ` ${type.toUpperCase()} `
          )}]: ${content} `
        );
      }
      case "ready": {
        return console.log(
          `${timestamp} [${chalk.black.bgGreen(
            type.toUpperCase()
          )}]: ${content}`
        );
      }
      default:
        throw new TypeError(
          "Logger type must be either warn, debug, log, ready, cmd or error."
        );
    }
  }

  static error(content) {
    return this.log(content, "error");
  }

  static warn(content) {
    return this.log(content, "warn");
  }

  static debug(content) {
    return this.log(content, "debug");
  }

  static cmd(content) {
    return this.log(content, "cmd");
  }

  static ready(content) {
    return this.log(content, "ready");
  }
}
