#!/usr/bin/env node

import "dotenv/config"

export const DEFAULT_PAGE_LIMIT = 25
export const DEFAULT_PAGE_OFFSET = 0

export const CHAIN_ID =
  process.env.CHAIN_ID || 'housefire-head.a03c8e8948ed20b'

export const DATABASE_URL =
  process.env.DATABASE_URL || `postgres://postgres:insecure@localhost:5432/${CHAIN_ID}`

export const RPC_URL =
  //process.env.RPC_URL || 'https://rpc.housefire.tududes.com/';
  process.env.RPC_URL || 'https://rpc.knowable.run/';

export const NODE_LOWEST_BLOCK_HEIGHT =
  process.env.NODE_LOWEST_BLOCK_HEIGHT ?? 0; //237907;

export const PRE_UNDEXER_RPC_URL =
  process.env.PRE_UNDEXER_RPC_URL || RPC_URL;

export const POST_UNDEXER_RPC_URL =
  process.env.POST_UNDEXER_RPC_URL || RPC_URL;

export const START_FROM_SCRATCH =
  process.env.START_FROM_SCRATCH || false;

export const UNDEXER_API_URL = 
  process.env.UNDEXER_API_URL || "http://v2.namada.undexer.demo.hack.bg";

export const VALIDATOR_UPDATE_INTERVAL =
  Number(process.env.VALIDATOR_UPDATE_INTERVAL) || 10000

export const PROPOSAL_UPDATE_INTERVAL =
  Number(process.env.PROPOSAL_UPDATE_INTERVAL) || 30000

export const VALIDATOR_TENDERMINT_METADATA_PARALLEL =
  Boolean(process.env.VALIDATOR_TENDERMINT_METADATA_PARALLEL) || true

export const VALIDATOR_NAMADA_METADATA_PARALLEL =
  Boolean(process.env.VALIDATOR_NAMADA_METADATA_PARALLEL) || true

export const BLOCK_UPDATE_INTERVAL =
  Number(process.env.BLOCK_UPDATE_INTERVAL) || 5000

// Must be less than BLOCK_UPDATE_INTERVAL so that it eventually catches up
export const EPOCH_UPDATE_INTERVAL =
  Number(process.env.EPOCH_UPDATE_INTERVAL) || 250

export const VALIDATOR_TRANSACTIONS = [
  "tx_become_validator.wasm",
  "tx_change_validator_commission.wasm",
  "tx_change_validator_metadata.wasm",
  "tx_deactivate_validator.wasm",
  "tx_activate_validator.wasm",
  "tx_remove_validator.wasm",
  "tx_add_validator.wasm",
  "tx_change_validator_power.wasm",
  "tx_change_validator_commission.wasm",
  "tx_deactivate_validator.wasm",
  "tx_reactivate_validator.wasm",
  "tx_unjail_validator.wasm",
  "tx_bond.wasm",
]

export const GOVERNANCE_TRANSACTIONS = [
  "tx_vote_proposal.wasm",
  "tx_init_proposal.wasm"
]

export const TOKENS = [
  {
    "address": "tnam1qy440ynh9fwrx8aewjvvmu38zxqgukgc259fzp6h",
    "symbol": "NAM",
    "coin": "Namada"
  },
  {
    "address": "tnam1qyzv6anc548dyj0nqvezrxxd6679d0a02y78k3xx",
    "symbol": "DOT",
    "coin": "Polkadot"
  },
  {
    "address": "tnam1q9046ls453j29xp0g90vm05dpped9adweyjnplkl",
    "symbol": "ETH",
    "coin": "Ethereum"
  },
  {
    "address": "tnam1qy4u69pe54hyssg9g42equq0z2vrj9rlnsrfcu6l",
    "symbol": "BTC",
    "coin": "Bitcoin"
  },
  {
    "address": "tnam1qxkdfqv2shgyllcf7dq5qlvf8gt6a2kr0s33ye26",
    "symbol": "SCH",
    "coin": "Schnitzel"
  },
  {
    "address": "tnam1qy4pd2j2wkp34c49epd5wy9ny83qsedekgac6gyr",
    "symbol": "APF",
    "coin": "Apfel"
  },
  {
    "address": "tnam1q982u50dxneydrlne6nfhrcwxc5mlxtpssjjdp3q",
    "symbol": "KAR",
    "coin": "Kartoffel"
  }
]

import { fileURLToPath } from 'node:url'
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('Current configuration:', {
    DEFAULT_PAGE_LIMIT,
    DEFAULT_PAGE_OFFSET,
    CHAIN_ID,
    PRE_UNDEXER_RPC_URL,
    POST_UNDEXER_RPC_URL,
    DATABASE_URL,
    NODE_LOWEST_BLOCK_HEIGHT,
    START_FROM_SCRATCH,
    UNDEXER_API_URL,
    VALIDATOR_UPDATE_INTERVAL,
    PROPOSAL_UPDATE_INTERVAL,
    VALIDATOR_TENDERMINT_METADATA_PARALLEL,
    VALIDATOR_NAMADA_METADATA_PARALLEL,
    BLOCK_UPDATE_INTERVAL,
    EPOCH_UPDATE_INTERVAL,
    VALIDATOR_TRANSACTIONS,
    GOVERNANCE_TRANSACTIONS,
    TOKENS,
  })
}
