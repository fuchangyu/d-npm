import ora from 'ora';
import chalk from "chalk";

export class Spinner {
  private readonly ora: ora.Ora
  private beingText: string | null = null

  constructor () {
    this.ora = ora()
  }

  public start (text: string): Spinner {
    return this.being(text)
  }

  public stop (): Spinner {
    this.ora.stop()
    this.beingText = null
    return this
  }

  public succeed (text: string): Spinner  {
    this.ora.stop()
    this.ora.succeed(chalk.green(text))
    if (this.beingText !== null) {
      this.ora.start(this.beingText)
    }
    return this
  }

  public info (text: string): Spinner  {
    this.ora.stop()
    this.ora.info(text)
    if (this.beingText !== null) {
      this.ora.start(this.beingText)
    }
    return this
  }

  public being (text: string): Spinner  {
    this.beingText = text
    this.ora.start(text)
    return this
  }

  public fail (text: string): Spinner  {
    this.ora.stop()
    this.ora.fail(chalk.red(text))
    if (this.beingText !== null) {
      this.ora.start(this.beingText)
    }
    return this
  }

  public warn (text: string): Spinner  {
    this.ora.stop()
    this.ora.warn(chalk.yellowBright(text))
    if (this.beingText !== null) {
      this.ora.start(this.beingText)
    }
    return this
  }
}

