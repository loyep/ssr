import { promises } from 'fs'
import { resolve } from 'path'
import { loadConfig, getCwd, cryptoAsyncChunkName, getOutputPublicPath, loadModuleFromFramework } from 'ssr-server-utils'
import * as WebpackChain from 'webpack-chain'
import { getBaseConfig } from './base'

const ModuleNotFoundPlugin = require('react-dev-utils/ModuleNotFoundPlugin')
const safePostCssParser = require('postcss-safe-parser')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin')
const generateAnalysis = Boolean(process.env.GENERATE_ANALYSIS)
const loadModule = loadModuleFromFramework
let asyncChunkMap: Record<string, string[]> = {}

const getClientWebpack = (chain: WebpackChain) => {
  const { isDev, chunkName, getOutput, cwd, useHash, chainClientConfig, host, fePort } = loadConfig()
  const shouldUseSourceMap = isDev || Boolean(process.env.GENERATE_SOURCEMAP)
  const publicPath = getOutputPublicPath()
  getBaseConfig(chain, false)
  chain.devtool(isDev ? 'cheap-module-source-map' : (shouldUseSourceMap ? 'source-map' : false))
  chain.entry(chunkName)
    .add(require.resolve('../entry/client-entry'))
    .end()
    .output
    .path(getOutput().clientOutPut)
    .filename(useHash ? 'static/js/[name].[contenthash:8].js' : 'static/js/[name].js')
    .chunkFilename(useHash ? 'static/js/[name].[contenthash:8].chunk.js' : 'static/js/[name].chunk.js')
    .publicPath(publicPath)
    .end()
  chain.optimization
    .runtimeChunk(true)
    .splitChunks({
      chunks: 'all',
      name (module: any, chunks: any, cacheGroupKey: string) {
        return cryptoAsyncChunkName(chunks, asyncChunkMap)
      },
      cacheGroups: {
        vendors: {
          test: (module: any) => {
            return module.resource &&
              /\.js$/.test(module.resource) &&
              module.resource.match('node_modules')
          },
          name: 'vendor'
        }
      }
    })
    .when(!isDev, optimization => {
      optimization.minimizer('terser')
        .use(loadModule('terser-webpack-plugin'), [{
          terserOptions: {
            keep_fnames: true,
            parse: {
              ecma: 8
            },
            compress: {
              ecma: 5,
              warnings: false,
              comparisons: false,
              inline: 2
            },
            mangle: {
              safari10: true
            },
            output: {
              ecma: 5,
              comments: false,
              ascii_only: true
            }
          },
          extractComments: false,
          parallel: true,
          cache: true,
          sourceMap: shouldUseSourceMap
        }])
      optimization.minimizer('optimize-css').use(loadModule('optimize-css-assets-webpack-plugin'), [{
        cssProcessorOptions: {
          parser: safePostCssParser,
          map: shouldUseSourceMap ? {
            inline: false,
            annotation: true
          } : false
        }
      }])
    })

  chain.plugin('moduleNotFound').use(ModuleNotFoundPlugin, [cwd])

  chain.plugin('manifest').use(loadModule('webpack-manifest-plugin'), [{
    fileName: 'asset-manifest.json'
  }])

  chain.when(generateAnalysis, chain => {
    chain.plugin('analyze').use(BundleAnalyzerPlugin)
  })
  chain.when(isDev, chain => {
    chain.plugin('fast-refresh').use(new ReactRefreshWebpackPlugin({
      overlay: {
        sockHost: host,
        sockPort: fePort
      }
    }))
  })

  chain.plugin('WriteAsyncManifest').use(
    class WriteAsyncChunkManifest {
      apply (compiler: any) {
        compiler.hooks.watchRun.tap('thisCompilation', async () => {
          // 每次构建前清空上一次的 chunk 信息
          asyncChunkMap = {}
        })
        compiler.hooks.done.tapAsync(
          'WriteAsyncChunkManifest',
          async (params: any, callback: any) => {
            await promises.writeFile(resolve(getCwd(), './build/asyncChunkMap.json'), JSON.stringify(asyncChunkMap))
            callback()
          }
        )
      }
    }
  )
  chainClientConfig(chain) // 合并用户自定义配置

  return chain.toConfig()
}

export {
  getClientWebpack
}
