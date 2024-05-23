#!/usr/bin/env -S node --import=@ganesha/esbuild

import {
  NODE_LOWEST_BLOCK_HEIGHT,
  START_FROM_SCRATCH,
  VALIDATOR_UPDATE_INTERVAL,
  BLOCK_UPDATE_INTERVAL,
  VALIDATOR_TRANSACTIONS
} from "./constants.js";

import getRPC from "./connection.js";
import sequelize from "./db/index.js";
import EventEmitter from "node:events";
import { initialize, format, serialize } from "./utils.js";
import { getValidator, getValidatorsFromNode } from "./scripts/validator.js";
import { Console } from "@hackbg/fadroma";

import Block from "./models/Block.js";
import Proposal from "./models/Proposal.js";
import Validator from "./models/Validator.js";
import VoteProposal from "./models/Contents/VoteProposal.js";
import Cipher from "./models/Sections/Cipher.js";
import Code from "./models/Sections/Code.js";
import Data from "./models/Sections/Data.js";
import ExtraData from "./models/Sections/ExtraData.js";
import MaspBuilder from "./models/Sections/MaspBuilder.js";
import Signature from "./models/Sections/Signature.js";
import Transaction from "./models/Transaction.js";
import { WASM_TO_CONTENT } from './models/Contents/index.js';

await initialize();
await sequelize.sync({ force: Boolean(START_FROM_SCRATCH) });

const console = new Console("Index");
const events = new EventEmitter();

checkForNewBlock();
updateValidators();

async function updateValidators() {
  const { connection } = await getRPC(NODE_LOWEST_BLOCK_HEIGHT+1);
  const validators = await connection.getValidators({ details: true });
  await sequelize.transaction(async dbTransaction => {
    await Validator.destroy({ where: {} }, { transaction: dbTransaction });
    await Validator.bulkCreate(validators, { transaction: dbTransaction });
  })
  setTimeout(updateValidators, VALIDATOR_UPDATE_INTERVAL);
}

async function checkForNewBlock() {
  // should use newer node for the blockchain height
  const { connection }      = await getRPC(NODE_LOWEST_BLOCK_HEIGHT+1);
  const currentBlockOnChain = await connection.height;
  const latestBlockInDb     = await Block.max('height') || Number(NODE_LOWEST_BLOCK_HEIGHT);
  if (currentBlockOnChain > latestBlockInDb) {
    console.log("=> Current block on chain:", currentBlockOnChain);
    console.log("=> Latest block in DB:", latestBlockInDb);
    await updateBlocks(latestBlockInDb + 1, currentBlockOnChain);
  } else {
    console.info("=> No new blocks");
  }
  setTimeout(checkForNewBlock, BLOCK_UPDATE_INTERVAL);
}

async function updateBlocks(startHeight, endHeight) {
  console.log("=> Processing blocks from", startHeight, "to", endHeight);
  for (let height = startHeight; height <= endHeight; height++) {
    await updateBlock(height)
  }
}

async function updateBlock (height) {
  const { connection } = await getRPC(height);
  const block = await connection.fetchBlock({ height, raw: true });
  const blockData = {
    id:          block.id,
    header:      block.header,
    height:      block.header.height,
    results:     JSON.parse(block.rawResultsResponse),
    rpcResponse: JSON.parse(block.rawBlockResponse),
  };
  await sequelize.transaction(async dbTransaction => {
    await Block.create(blockData, { transaction: dbTransaction });
    for (const transaction of block.transactions) {
      transaction.txId = transaction.id
      await updateTransaction(height, transaction, events, dbTransaction);
    }
  })
  console.log("++ Added block", height);
  for (const transaction of block.transactions) {
    console.log("++ Added transaction", transaction.id);
  }
}

export async function updateTransaction(height, transaction, events, dbTransaction) {
  const console = new Console(`Block ${height}, TX ${transaction.id.slice(0, 8)}`)
  if (transaction.content !== undefined) {
    console.log("=> Add content", transaction.content.type);
    const uploadData = format(Object.assign(transaction.content));
    await WASM_TO_CONTENT[transaction.content.type].create(uploadData.data);
    if (VALIDATOR_TRANSACTIONS.includes(transaction.content.type)) {
      events.emit("updateValidators", height);
    }
    if (transaction.content.type === "transaction_vote_proposal.wasm") {
      events.emit("updateProposal", transaction.content.data.proposalId, height);
    }
    if (transaction.content.type === "transaction_init_proposal.wasm") {
      events.emit("createProposal", transaction.content.data);
    }
  }
  for (let section of transaction.sections) {
    console.log("=> Add section", section.type);
    if (section.type == "ExtraData") {
      await ExtraData.create(section, { transaction: dbTransaction });
    }
    if (section.type == "Code") {
      await Code.create(section, { transaction: dbTransaction });
    }
    if (section.type == "Data") {
      await Data.create(section, { transaction: dbTransaction });
    }
    if (section.type == "Signature") {
      await Signature.create(section, { transaction: dbTransaction });
    }
    if (section.type == "MaspBuilder") {
      await MaspBuilder.create(section, { transaction: dbTransaction });
    }
    if (section.type == "Cipher") {
      await Cipher.create(section, { transaction: dbTransaction });
    }
    if (section.type == "MaspBuilder") { // FIXME
      await MaspBuilder.create(section, { transaction: dbTransaction });
    }
  }
  delete transaction.content
  delete transaction.sections
  console.log("=> Add");
  await Transaction.create(transaction, { transaction: dbTransaction });
}

events.on("updateValidators", async () => {
  console.log("=> Updating validators");
  const { query, connection } = await getRPC(NODE_LOWEST_BLOCK_HEIGHT + 1);
  const validatorsBinary = await getValidatorsFromNode(connection);
  const validators = []
  for (const validatorBinary of validatorsBinary) {
    const validator = await getValidator(query, connection, validatorBinary);
    //const validatorData = JSON.parse(serialize(validator));
    validators.push(validator);
  }
  await sequelize.transaction(async dbTransaction => {
    for (const validatorData of validators) {
      await Validator.create(validatorData, { transaction: dbTransaction });
    }
  })
});

events.on("createProposal", async (txData) => {
  console.log("=> Creating proposal", txData);
  await Proposal.create(txData);
  // const latestProposal = await Proposal.findOne({ order: [["id", "DESC"]] });
  /*
    const { q } = getUndexerRPCUrl(NODE_LOWEST_BLOCK_HEIGHT+1)
    const proposalChain = await q.query_proposal(BigInt(txData.proposalId));
    await Proposal.create(proposalChain);
    */
});

events.on("updateProposal", async (proposalId, blockHeight) => {
  console.log("=> Updating proposal");
  const { query } = await getRPC(blockHeight);
  const proposal = await q.query_proposal(BigInt(proposalId));
  await sequelize.transaction(async dbTransaction => {
    await Proposal.destroy({ where: { id: proposalId } }, { transaction: dbTransaction });
    await VoteProposal.create(proposal, { transaction: dbTransaction });
  })
});
