import path from 'path'
import axios from 'axios'
import fs from 'fs'
import { FOLDER_PATH } from '../global'
import { PackageItem } from '../types'
import { downloadTgz } from './downloadFile'

const METADATA_TIMEOUT = 30_000

export class Download {
  private concurrencyNum: number
  private downloadPool: Array<() => any> = []
  private downloadingNum: number = 0

  constructor (concurrencyNum: number) {
    this.concurrencyNum = concurrencyNum
  }

  public downPackage (info: PackageItem) {
    return new Promise((resolve, reject) => {

      const action = async () => {
        const destDir = path.join(FOLDER_PATH, info.path)
        const tgzPath = path.join(destDir, info.name)
        const packageJsonPath = path.join(destDir, 'package.json')

        try {
          await downloadTgz(info.resolved, tgzPath, info.integrity)

          const res = await axios.get(info.resolved.split('/-/')[0], {
            timeout: METADATA_TIMEOUT,
            validateStatus: (status) => status === 200,
          })

          fs.writeFileSync(packageJsonPath, JSON.stringify(res.data))

          resolve(info)
        } catch {
          if (fs.existsSync(tgzPath)) {
            fs.unlinkSync(tgzPath)
          }
          reject(info)
        } finally {
          this.downloadingNum -= 1

          if (this.downloadPool.length) {
            this.downloadingNum += 1

            this.downloadPool.shift()()
          }
        }
      }

      if (this.downloadingNum < this.concurrencyNum) {
        this.downloadingNum += 1

        action()
      } else {
        this.downloadPool.push(action)
      }
    })
  }
}
