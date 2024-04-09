#!/usr/bin/env node
import { readFileSync } from "node:fs";
import * as Namada from "@fadroma/namada";
import "dotenv/config";

import Block from "../models/Block.js";
import Transaction from "../models/Transaction.js";
import { SectionTypeToModel, format, initialize } from "../utils.js";

initialize()

export default async function uploadBlocksAndTxs(RPC_URL) {
    // Nodes have a set of blocks that they have indexed. Indexing lower
    // blocks is not possible. We need to start indexing from the lowest.
    const lowestBlockHeight = 238387;
    const connection = Namada.testnet({
        url: process.env.UNDEXER_RPC_URL || RPC_URL,
    });
    let blockchainHeight = await connection.height;
    let blocksInDb = await Block.findAll();
    let blockDbHeight =
        blocksInDb[blocksInDb.length - 1]?.header.height || lowestBlockHeight;

    await ingestBlocks(connection, blockDbHeight, blockchainHeight);
}

export async function ingestBlock(connection, blockDbHeight, blockchainHeight) {
    console.log(
        "\nIndexing block:",
        blockDbHeight,
        "of",
        blockchainHeight,
        `(${((blockDbHeight / blockchainHeight) * 100).toFixed(3)}%)`
    );

    const { txs, txsDecoded, ...block } = await connection.getBlock(
        blockDbHeight
    );
    // save blocks to db
    const blockDb = await Block.create(block);
    await blockDb.save();

    // save transactions to db
    const txDb = await Transaction.bulkCreate(txsDecoded);
    await txDb.save();

    // save transaction content to db and filter to the right model
    for (let txDecoded of txsDecoded) {
        try{
            const { type } = txDecoded.content;
            const txContentDb = await SectionTypeToModel[type].create(format(txDecoded.content));
            await txContentDb.save();
        }
        catch(e){
            console.error('No content in transaction');
        }
    }
}