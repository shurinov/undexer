import { Console } from '@fadroma/namada'
import * as DB from './db.js'
import * as Query from './query.js'

export console = new Console('Epoch')

export async function tryUpdateEpochs (chain) {
  const block = await DB.Block.findOne({
    where: { epoch: null }, attributes: { include: [ 'blockHeight' ] }
  })
  if (block) {
    console.log(`=> Fetching epoch for block ${block.blockHeight}`)
    block.epoch = await chain.fetchEpoch({ height: block.blockHeight })
    await block.save()
  }
}
