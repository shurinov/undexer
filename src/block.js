import { Console } from '@fadroma/namada'
import * as DB from './db.js';
import * as Query from './query.js';
import {
  GOVERNANCE_TRANSACTIONS,
  VALIDATOR_TRANSACTIONS,
  NODE_LOWEST_BLOCK_HEIGHT
} from './config.js'
import { cleanup } from './utils.js'

const console = new Console('Block')

/** Called every `BLOCK_UPDATE_INTERVAL` msec by a `setInterval` in `bin/indexer.js` */
export async function tryUpdateBlocks (chain, events) {
  // Setting `NODE_LOWEST_BLOCK_HEIGHT` allows a minimum block to be set
  const latestBlockInDb = await Query.latestBlock() || Number(NODE_LOWEST_BLOCK_HEIGHT)
  console.log("=> Latest block in DB:", latestBlockInDb)
  const latestBlockOnChain = await chain.fetchHeight()
  console.log("=> Latest block on chain:", latestBlockOnChain)
  if (latestBlockOnChain > latestBlockInDb) {
    await updateBlocks(chain, events, latestBlockInDb + 1, latestBlockOnChain)
  } else {
    console.info("=> No new blocks");
  }
}

export async function updateBlocks (chain, events, startHeight, endHeight) {
  console.log("=> Processing blocks from", startHeight, "to", endHeight);
  let height = startHeight
  try {
    for (; height <= endHeight; height++) {
      await updateBlock({ chain, events, height })
    }
  } catch (e) {
    console.error('Failed to index block', height)
    console.error(e)
  }
}

/** Uses the `/block` and `/block_results` RPC endpoints
   * to fetch data for a single block. */
export async function updateBlock ({ chain, events, height, block }) {
  const t0 = performance.now()
  block ??= await chain.fetchBlock({ height, raw: true })
  await DB.withErrorLog(() => DB.default.transaction(async dbTransaction => {
    const data = {
      chainId:      block.header.chainId,
      blockTime:    block.time,
      blockHeight:  block.height,
      blockHash:    block.hash,
      blockHeader:  block.header,
      blockData:    JSON.parse(block.responses?.block.response||"null"),
      blockResults: JSON.parse(block.responses?.results.response||"null"),
      rpcResponses: block.responses,
      epoch:        await chain.fetchEpoch({ height: block.height }).catch(()=>{
        console.warn('Could not fetch epoch for block', block.height, '- will retry later')
        return undefined
      }),
    }
    await DB.Block.create(data, { transaction: dbTransaction });
    for (const transaction of block.transactions) {
      await updateTransaction({
        block,
        events,
        height,
        transaction,
        dbTransaction,
      })
    }
  }), { update: 'block', height })
  const t = performance.now() - t0
  const console = new Console(`Block ${height}`)
  for (const transaction of block.transactions) {
    console.log("++ Added transaction", transaction.id);
  }
  console.log("++ Added block", height, 'in', t.toFixed(0), 'msec');
  console.br()
}

export async function updateTransaction ({
  block,
  events,
  height,
  transaction,
  dbTransaction,
}) {
  const console = new Console(
    `Block ${height}, TX ${transaction.id.slice(0, 8)}`
  )
  const { content, sections } = transaction.data
  if (content) {
    console.log("=> Add content", content.type);
    const uploadData = { ...content }
    if (GOVERNANCE_TRANSACTIONS.includes(uploadData.type)) {
      uploadData.data.proposalId = Number(uploadData.data.id);
      delete uploadData.data.id;
    }
    if (VALIDATOR_TRANSACTIONS.includes(content.type)) {
      events?.emit("updateValidators", height);
    }
    if (content.type === "transaction_vote_proposal.wasm") {
      events?.emit("updateProposal", content.data.proposalId, height);
    }
    if (content.type === "transaction_init_proposal.wasm") {
      events?.emit("createProposal", content.data, height);
    }
  } else {
    console.warn(`Unsupported content ${content?.type}`)
  }
  for (let section of sections) {
    console.log("=> Add section", section.type);
  }
  const data = {
    chainId:     transaction.data.chainId,
    blockHash:   transaction.block.hash,
    blockTime:   transaction.block.time,
    blockHeight: transaction.block.height,
    txHash:      transaction.id,
    txTime:      transaction.data.timestamp,
    txData:      transaction,
  }
  console.log("=> Adding transaction", data);
  await DB.Transaction.create(data, { transaction: dbTransaction });
}
