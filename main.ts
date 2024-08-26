import Commands from "@hackbg/cmds"
import EventEmitter from 'node:events'

export default class UndexerCommands extends Commands {
  // see https://github.com/hackbg/fadroma/blob/v2/packages/namada/namada.ts
  // for examples how to define commands

  constructor (...args) {
    super(...args)
    this.log.label = ''
  }

  dbStatus = this.command({
    name: 'db status',
    info: 'show the status of the database'
  }, async () => {
    const DB = await import('./src/db.js')
    console.log('Rows in DB:')
    console.log('Blocks:', await DB.Block.count())
    console.log('Transactions:', await DB.Transaction.count())
    console.log('Validators:', await DB.Validator.count())
    console.log('Proposals:', await DB.Proposal.count())
    console.log('Proposal WASM binaries:', await DB.ProposalWASM.count())
    console.log('Votes:', await DB.Vote.count())
  })

  dbSync = this.command({
    name: "db sync",
    info: "create database"
  }, async () => {
    const { default: db } = await import('./src/db.js')
    this.log.br().log('Trying to sync database schema...')
    await db.sync()
    this.log.br().log('Done.')
  })

  dbSyncForce = this.command({
    name: "db sync drop",
    info: "UNSAFE: delete and re-create database with latest schema"
  }, async () => {
    const { default: db } = await import('./src/db.js')
    this.log.br().log('Trying to force-sync database schema...')
    await db.sync({ force: true })
    this.log.br().log('Done.')
  })

  dbSyncAlter = this.command({
    name: "db sync alter",
    info: "UNSAFE: alter database to latest schema"
  }, async () => {
    const { default: db } = await import('./src/db.js')
    this.log.br().log('Trying to alter database schema...')
    await db.sync({ alter: true })
    this.log.br().log('Done.')
  })

  api = this.command({
    name: "api",
    info: "run the API server"
  }, () => import('./bin/api.js'))

  indexer = this.command({
    name: "index",
    info: "run the indexer"
  }, () => import('./bin/indexer.js'))

  blockFetch = this.command({
    name: 'block fetch',
    info: 'fetch and print a block of transactions',
    args: '[HEIGHT]'
  }, async (height?: number) => {
    const t0 = performance.now()
    const { default: getRPC } = await import('./src/rpc.js')
    const chain = await getRPC(height)
    // Fetch and decode block
    const block = await chain.fetchBlock({ height })
    height ??= block.height
    // Print block and transactions
    this.log.br().log(block)
    for (const transaction of block.transactions) {
      const { hash, data: { batch, sections, content, ...data } } = transaction
      this.log.br()
        .log('Transaction', hash, ':', data)
        .log('Sections of', hash, ':', sections)
        .log('Batched in', hash, ':', batch)
        .log('Content of', hash, ':', content)
    }
    this.log.info('Done in', performance.now() - t0, 'msec')
  })

  blockIndex = this.command({
    name: 'block index',
    info: 'fetch, print, and store a block of transactions',
    args: '[HEIGHT]'
  }, async (height?: number) => {
    const t0 = performance.now()
    const { updateBlock } = await import('./src/block.js')
    const { default: getRPC } = await import('./src/rpc.js')
    const chain = await getRPC(height)
    // Fetch and decode block
    const block = await chain.fetchBlock({ height })
    height ??= block.height
    // Print block and transactions
    this.log.br().log(block)
    for (const transaction of block.transactions) {
      const { hash, data: { batch, sections, ...data } } = transaction
      this.log.br()
        .log('Transaction', hash, ':', data)
        .log('Sections for', hash, ':', sections)
        .log('Batch in', hash, ':', batch)
    }
    // Write block to database
    this.log.br().log('Syncing database...')
    const { default: db } = await import('./src/db.js')
    await db.sync()
    this.log.br().log('Saving block', height, 'to database...').br()
    await updateBlock({ chain, height, block, })
    this.log.info('Done in', performance.now() - t0, 'msec')
  })

  validatorsFetchList = this.command({
    name: 'validators fetch list',
    info: 'fetch list of validators'
  }, async () => {
    const { default: getRPC } = await import('./src/rpc.js')
    const chain = await getRPC()
    const addresses = Object.values(await chain.fetchValidators({
      tendermintMetadata: false,
      namadaMetadata:     false,
    })).map(v=>v.namadaAddress).sort()
    for (const address of addresses) {
      this.log.log('Validator:', address)
    }
    this.log.br().info("Use the 'validators fetch all' command to get details.")
  })

  validatorsFetchAll = this.command({
    name: 'validators fetch all',
    info: 'fetch detailed info about validators'
  }, async () => {
    const { default: getRPC } = await import('./src/rpc.js')
    const chain = await getRPC()
    const validators = Object.values(await chain.fetchValidators())
    const states = {}
    for (const validator of validators) {
      this.log.br().log(validator)
      states[validator.state?.state]??=0
      states[validator.state?.state]++
    }
    this.log.br().info(validators.length, "validators.")
    for (const [state, count] of Object.entries(states)) {
      this.log.info(`${state}:`.padEnd(16), count)
    }
  })

  validatorsUpdate = this.command({
    name: 'validators update',
    info: 'fetch validators and update in db'
  }, async () => {
    const { default: getRPC } = await import('./src/rpc.js')
    const chain = await getRPC()
    const { updateValidators } = await import('./src/validator.js')
    const validators = await updateValidators(chain)
    for (const i in validators) {
      console.log(`#${Number(i)+1}:`, validators[i])
    }
  })

  validatorsStates = this.command({
    name: 'validators states',
    info: 'count validators in database by state'
  }, async (height: number) => {
    const { callRoute, dbValidatorStates } = await import('./src/routes.js')
    const states = await callRoute(dbValidatorStates)
    console.log({states})
  })

  validatorsQuery = this.command({
    name: 'validators query',
    info: 'query validators from db'
  }, async (height: number) => {
    const { validatorsTop } = await import('./src/query.js')
    const validators = (await validatorsTop()).map(x=>x.toJSON());
    console.log(validators)
    const { routes } = await import('./src/routes.js')
    const dbValidatorByHash = Object.fromEntries(routes)['/validator']
    for (const { publicKey } of validators) {
      console.log(await new Promise((resolve, reject)=>dbValidatorByHash(
        { query: { publicKey, uptime: 100 } },
        { status: code => ({
            send: (data) => (code===200)
              ? resolve(data)
              : reject(Object.assign(new Error(`route returned ${code}`), data))
          }) } )))
    }
  })

  queries = this.command({
    name: 'queries',
    info: 'test all db queries',
  }, async () => {
    for (const [name, item] of Object.entries(await import('./src/query.js'))) {
      if (typeof item === 'function') {
        this.log.br().log(name)
        this.log(await item())
      }
    }
  })

  parameters = this.command({
    name: 'parameters',
    info: 'fetch chain parameters'
  }, async () => {
    const { default: getRPC } = await import('./src/rpc.js')
    const chain      = await getRPC()
    const parameters = await chain.fetchProtocolParameters()
    console.log({parameters})
  })

  proposalCount = this.command({
    name: 'proposal count',
    info: 'fetch count of proposals from chain'
  }, (id: string) =>
    import('./src/rpc.js')
      .then(({ default: getRPC })=>getRPC())
      .then(chain=>chain.fetchProposalCount())
      .then((count)=>this.log
        .log('Proposals on chain:', count)))

  proposalFetch = this.command({
    name: 'proposal fetch',
    args: 'ID',
    info: 'fetch proposal from chain'
  }, async (id: string) => {
    const chain = await import('./src/rpc.js').then(({ default: getRPC })=>getRPC())
    const data = await chain.fetchProposalInfo(id)
    if (data) {
      this.log
        .log('Proposal:', data.proposal)
        .log('Votes:',    data.votes)
        .log('Result:',   data.result)
      if (data.proposal.type?.type === 'DefaultWithWasm') {
        const result = await chain.fetchProposalWasm(id)
        if (result) {
          this.log.log('WASM:', result.wasm.length, 'bytes')
        }
      }
    } else {
      this.log.error(`Proporsal ${id} not found.`)
    }
  })

  proposalIndex = this.command({
    name: 'proposal index',
    args: 'ID',
    info: 'fetch and store proposal from chain'
  }, async (id: string) => {
    const chain = await import('./src/rpc.js').then(({ default: getRPC })=>getRPC())
    const { updateProposal } = await import('./src/proposal.js')
    await updateProposal(chain, id)
  })

  epoch = this.command({
    name: 'epoch',
    args: '[HEIGHT]',
    info: 'fetch epoch for given or latest block'
  }, (height: string) =>
    import('./src/rpc.js')
      .then(({ default: getRPC })=>getRPC())
      .then(chain=>chain.fetchEpoch({
        height: (height === undefined) ? undefined : Number(height)
      }))
      .then(this.log)
      .catch(this.error))

  reindexTransactions = this.command({
    name: 'reindex txs',
    info: 'reindex only blocks containing transactions',
    args: '[TXTYPE]', // TODO
  }, async () => {
    const {Transaction} = await import('./src/db.js')
    const attributes = { include: [ 'blockHeight' ] }
    const where = { /* TODO filter by tx type */ }
    const txs = await Transaction.findAll({ where, attributes })
    const blocks = new Set(txs.map(tx=>tx.get().blockHeight))
    this.log(blocks.size, 'blocks containing transaction')
    const { updateBlock } = await import('./src/block.js')
    const chain = await import('./src/rpc.js').then(({ default: getRPC })=>getRPC())
    for (const height of [...blocks.sort()]) {
      this.log('Reindexing block', height)
      await updateBlock({ chain, height })
    }
  })

}
