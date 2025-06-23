import { Download } from "./Download";
import { Spinner } from "./Spinner";
import { LockData, PackageItem } from "../types";
import fs from "fs-extra";
import { i18n } from '../i18n';

export const spinner: Spinner = new Spinner()

export const download = new Download(10)


export function parseLock (lockData: LockData): PackageItem[] {
  const packages: PackageItem[] = []

  if (lockData.packages) {
    for (let key in lockData.packages) {
      const path: string = key.split('node_modules/').at(-1)
      const item = lockData.packages[key]
      if (path && item.resolved) {
        try {
          new URL(item.resolved)
          packages.push({
            name: item.resolved.split('/').pop(),
            resolved: item.resolved,
            path: path,
            v: item.version
          })
        } catch (e) {
          spinner.warn(i18n.__('resolvedError') + packages.at(-1).name + i18n.__('resolvedError2'))
        }

      }
    }
  } else if (lockData.dependencies) {
    const loopDependencies = (dependenciesData) => {
      const dependencies = dependenciesData.dependencies || {};
      Object.keys(dependencies).forEach(function (key) {
        if (key) {
          packages.push({
            name: dependencies[key].resolved.split('/').pop(),
            resolved: dependencies[key].resolved,
            path: key,
            v: dependencies[key].version
          })
          loopDependencies(dependencies[key])
        }
      })
    }
    loopDependencies(lockData)
  }

  return packages
}

export function readLock (path: string): Promise<LockData> {
  return new Promise((resolve) => {
    try {
      const context = fs.readJSONSync(path)
      resolve(context)
    } catch {
      spinner.fail(i18n.__('readPackageLockFileFailed'))
      process.exit(0)
    }
  })
}

export function downloadPackages (packages: PackageItem[]) {
  return new Promise(resolve => {


    let length = packages.length

    const date = Date.now()

    const failures = []

    packages.forEach((p) => {
      download.downPackage(p).then(() => {
        length --
      }).catch(() => {
        failures.push(p)
        length --
      })
    })

    const points: string[] = ['', '.', '.', '.', '..', '..', '..', '...', '...', '...']

    let i = 0

    setInterval(() => {
      if (length) {
        spinner.start(`${i18n.__('downloading') + points[i] }
  ${i18n.__('amount') + packages.length }
  ${i18n.__('residue') +  length }  
  ${i18n.__('failed') +  failures.length }  
  ${i18n.__('time') +  (Date.now() - date) / 1000 }s`)
        if (i >= points.length - 1) {
          i = 0
        } else {
          i ++
        }
      } else {
        spinner.stop()
        if (failures.length) {
          spinner.fail(i18n.__('readPackageFileFailed') + failures.length)
          failures.forEach((f) => spinner.fail(f.path + '@' + f.v))
        } else {
          spinner.succeed(i18n.__('succeed'))
        }
        resolve(true)
      }
    }, 200)
  })

}