import {
  Controller,
  Get,
  Post,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { AppService } from './app.service';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('playground/run')
  async runPlaygroundCode(
    @Body('code') code: string,
    @Body('language') language: string,
    @Body('stdin') stdin?: string,
  ) {
    if (!code) throw new BadRequestException('Code is required');
    if (!language) throw new BadRequestException('Language is required');

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studysync-run-'));
    let fileName = '';
    let runCmd = '';
    let runArgs: string[] = [];
    let compileCmd = '';
    let compileArgs: string[] = [];

    if (language === 'javascript') {
      fileName = 'index.js';
      runCmd = 'node';
      runArgs = [path.join(tempDir, fileName)];
    } else if (language === 'python') {
      fileName = 'index.py';
      runCmd = 'python3';
      runArgs = [path.join(tempDir, fileName)];
    } else if (language === 'cpp') {
      fileName = 'index.cpp';
      compileCmd = 'g++';
      compileArgs = [
        '-std=c++17',
        path.join(tempDir, fileName),
        '-o',
        path.join(tempDir, 'a.out'),
      ];
      runCmd = path.join(tempDir, 'a.out');
      runArgs = [];
    } else if (language === 'java') {
      fileName = 'Main.java';
      compileCmd = 'javac';
      compileArgs = [path.join(tempDir, fileName)];
      runCmd = 'java';
      runArgs = ['-cp', tempDir, 'Main'];
    } else {
      fs.rmSync(tempDir, { recursive: true, force: true });
      throw new BadRequestException(`Unsupported language: ${language}`);
    }

    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, code);

    const startTime = Date.now();

    if (compileCmd) {
      try {
        const compileRes = await new Promise<{
          stdout: string;
          stderr: string;
          code: number | null;
        }>((resolve) => {
          const cp = spawn(compileCmd, compileArgs);
          let stdout = '';
          let stderr = '';
          cp.stdout.on('data', (d) => (stdout += d.toString()));
          cp.stderr.on('data', (d) => (stderr += d.toString()));
          cp.on('close', (code) => resolve({ stdout, stderr, code }));
        });

        if (compileRes.code !== 0) {
          fs.rmSync(tempDir, { recursive: true, force: true });
          return {
            stdout: compileRes.stdout,
            stderr: compileRes.stderr,
            exitCode: compileRes.code,
            duration: Date.now() - startTime,
            compileError: true,
          };
        }
      } catch (err) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        return {
          stdout: '',
          stderr: String(err),
          exitCode: -1,
          duration: Date.now() - startTime,
          compileError: true,
        };
      }
    }

    try {
      const runRes = await new Promise<{
        stdout: string;
        stderr: string;
        code: number | null;
        error?: string;
      }>((resolve) => {
        const cp = spawn(runCmd, runArgs);
        let stdout = '';
        let stderr = '';
        let killed = false;

        const timeout = setTimeout(() => {
          cp.kill();
          killed = true;
        }, 5000);

        if (stdin) {
          cp.stdin.write(stdin);
          cp.stdin.end();
        }

        cp.stdout.on('data', (d) => (stdout += d.toString()));
        cp.stderr.on('data', (d) => (stderr += d.toString()));
        cp.on('error', (err) => {
          clearTimeout(timeout);
          resolve({ stdout, stderr, code: -1, error: err.message });
        });
        cp.on('close', (code) => {
          clearTimeout(timeout);
          if (killed) {
            resolve({
              stdout,
              stderr,
              code: -1,
              error: 'Execution Timed Out (Maximum 5 seconds)',
            });
          } else {
            resolve({ stdout, stderr, code });
          }
        });
      });

      fs.rmSync(tempDir, { recursive: true, force: true });
      return {
        stdout: runRes.stdout,
        stderr: runRes.stderr || runRes.error || '',
        exitCode: runRes.code,
        duration: Date.now() - startTime,
        compileError: false,
      };
    } catch (err) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      return {
        stdout: '',
        stderr: String(err),
        exitCode: -1,
        duration: Date.now() - startTime,
        compileError: false,
      };
    }
  }
}
