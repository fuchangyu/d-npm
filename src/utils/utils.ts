import { Download } from "./Download";
import { Spinner } from "./Spinner";
import { LockData, PackageItem } from "../types";
import fs from "fs-extra";
import { i18n } from '../i18n';

export const spinner: Spinner = new Spinner()

export const download = new Download(10)

function resolvePackageName (item: { name?: string; resolved: string }): string {
  if (item.name) return item.name
  const base = item.resolved.split('/-/')[0]
  return decodeURIComponent(new URL(base).pathname.slice(1))
}

function normalizeIntegrity (item: { integrity?: string; shasum?: string }): string | undefined {
  if (item.integrity) return item.integrity
  if (item.shasum) {
    return `sha1-${Buffer.from(item.shasum, 'hex').toString('base64')}`
  }
  return undefined
}

function createPackageItem (item: {
  name?: string
  resolved: string
  version: string
  integrity?: string
  shasum?: string
}): PackageItem {
  const packageName = resolvePackageName(item)

  return {
    name: item.resolved.split('/').pop(),
    resolved: item.resolved,
    path: packageName,
    v: item.version,
    integrity: normalizeIntegrity(item)
  }
}

function dedupePackages (packages: PackageItem[]): PackageItem[] {
  const seen = new Set<string>()
  const result: PackageItem[] = []

  for (const pkg of packages) {
    if (seen.has(pkg.resolved)) continue
    seen.add(pkg.resolved)
    result.push(pkg)
  }

  return result
}

export function parseLock (lockData: LockData): PackageItem[] {
  const packages: PackageItem[] = []

  if (lockData.packages) {
    for (let key in lockData.packages) {
      const lockPath: string = key.split('node_modules/').at(-1)
      const item = lockData.packages[key]
      if (lockPath && item.resolved) {
        try {
          new URL(item.resolved)
          packages.push(createPackageItem(item))
        } catch (e) {
          spinner.warn(i18n.__('resolvedError') + item.resolved + i18n.__('resolvedError2'))
        }

      }
    }
  } else if (lockData.dependencies) {
    const loopDependencies = (dependenciesData) => {
      const dependencies = dependenciesData.dependencies || {};
      Object.keys(dependencies).forEach(function (key) {
        if (key) {
          const dep = dependencies[key]
          packages.push(createPackageItem(dep))
          loopDependencies(dep)
        }
      })
    }
    loopDependencies(lockData)
  }

  return dedupePackages(packages)
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

    const timer = setInterval(() => {
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
        clearInterval(timer)
        spinner.stop()
        if (failures.length) {
          spinner.fail(i18n.__('failedDownloadPackage') + failures.length)
          failures.forEach((f) => spinner.fail(f.path + '@' + f.v))
        } else {
          spinner.succeed(i18n.__('succeed'))
        }
        resolve(true)
      }
    }, 200)
  })

}
