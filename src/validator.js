#!/usr/bin/env node

import * as Namada from "@fadroma/namada";
import { base16 } from '@hackbg/fadroma';
const console = new Namada.Console(`Validators`)

import { deserialize } from "borsh";
import { retryForever } from "./utils.js";
import db, { withErrorLog, Validator } from './db.js'

import {
  VALIDATOR_TENDERMINT_METADATA_PARALLEL,
  VALIDATOR_NAMADA_METADATA_PARALLEL,
} from './config.js';

export async function tryUpdateValidators (chain, height) {
  try {
    await updateValidators(chain, height)
  } catch (e) {
    console.error('Failed to update validators.')
    console.error(e)
  }
}

export async function updateValidators (chain, height) {
  console.log("=> Updating validators")
  let count   = 0
  let added   = 0
  let updated = 0
  for await (const validator of chain.fetchValidatorsIter({
    parallel: true
  })) {
    const existing = await Validator.findOne({
      where: { namadaAddress: validator.namadaAddress }
    })
    if (existing) {
      console.log('Updating validator', validator)
      existing.publicKey = validator.publicKey
      existing.pastPublicKeys = [...new Set([
        ...existing.pastPublicKeys||[],
        validator.publicKey
      ].filter(Boolean))]
      existing.consensusAddress = validator.address
      existing.pastConsensusAddresses = [...new Set([
        ...existing.pastConsensusAddresses||[],
        validator.address
      ].filter(Boolean))]
      existing.votingPower = validator.votingPower
      existing.proposerPriority = validator.proposerPriority
      existing.metadata = validator.metadata
      existing.commission = validator.commission
      existing.stake = validator.stake
      existing.state = validator.state
      await existing.save()
      updated++
    } else {
      console.log('Adding validator', validator.namadaAddress)
      await Validator.create(validator)
      added++
    }
    count++
  }
  console.log(`=> ${count} validators (added ${added}, updated ${updated})`)
}
