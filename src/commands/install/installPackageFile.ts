import cmd from 'node-cmd'
import fs from "fs-extra";
import { PACKAGE_PATH, TEMP_PACKAGE_LOCK_PATH, TEMP_PACKAGE_PATH, TEMP_PATH } from "../../global";
import { LockData } from "../../types";
import { downloadPackages, parseLock, readLock, spinner } from "../../utils/utils";
import { i18n } from '../../i18n';

export async function installPackageFile () {
  if (fs.existsSync(TEMP_PATH)) {
    fs.removeSync(TEMP_PATH)
  }

  let packageFile: Record<string, any>

  try {
    packageFile  = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf-8'))
  } catch {
    spinner.fail(i18n.__('readPackageFileFailed')) // fall
    process.exit(0)
  }

  fs.mkdirSync(TEMP_PATH)

  fs.writeFileSync(TEMP_PACKAGE_PATH, JSON.stringify({
    dependencies: packageFile.dependencies || {},
    devDependencies: packageFile.devDependencies || {},
  }))

  spinner.start(i18n.__('parsingPackageFile'))

  cmd.run('cd ' + TEMP_PATH + '&&' +'npm install --package-lock-only', async (error) => {
    if (error) {
      fs.removeSync(TEMP_PATH)
      spinner.stop()
      spinner.fail(i18n.__('parsePackageFileFailed'))
      process.exit(0)
    }

    const context: LockData = await readLock(TEMP_PACKAGE_LOCK_PATH)

    fs.removeSync(TEMP_PATH)

    const packages = parseLock(context)

    await downloadPackages(packages)

    process.exit(0)
  })
}

