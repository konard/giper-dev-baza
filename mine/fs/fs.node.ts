namespace $ {
	
	/** Atomic transaction. */
	export class $giper_baza_mine_fs_yym_act extends $mol_object2 {
		
		constructor( public yym: $giper_baza_mine_fs_yym ) {
			super()
		}
		
		transaction!: $mol_file_transaction
		offsets_del = new WeakMap< ArrayBuffer, number >
		offsets_ins = new WeakMap< ArrayBuffer, number >
		
		/** Stores data and returns offset in file. */
		@ $mol_action
		save( ... data: [ ArrayBufferView< ArrayBuffer >, ... ArrayBufferView< ArrayBuffer >[] ] ) {
			
			let offset = this.offsets_ins.get( data[0].buffer )
			if( offset === undefined ) {
				
				offset = this.yym.offsets.get( data[0].buffer )
				if( offset ) return offset
				
				const size = data.reduce( ( sum, buf )=> sum + buf.byteLength, 0 )
				offset = this.yym.pool.acquire( size )
				this.offsets_ins.set( data[0].buffer, offset )
				this.yym.offsets.set( data[0].buffer, offset )
				
			} 
			
			this.transaction.write({
				buffer: data,
				position: offset,
			})
			
			return offset
		}
		
		/** Marks slice of file as free. */
		@ $mol_action
		free( ... data: [ ArrayBufferView< ArrayBuffer >, ... ArrayBufferView< ArrayBuffer >[] ] ) {
			
			const size = data.reduce( ( sum, buf )=> sum + buf.byteLength, 0 )
			
			let offset = this.offsets_del.get( data[0].buffer )
			if( offset === undefined ) {
				
				offset = this.yym.offsets.get( data[0].buffer )
				if( !offset ) return
				
				this.offsets_del.set( data[0].buffer, offset )
				this.yym.pool.release( offset, size )
				this.yym.offsets.delete( data[0].buffer )
				
			}
			
			this.transaction.write({
				buffer: new Uint8Array( size ),
				position: offset,
			})
			
		}
		
	}
	
	/** Yin-Yan Mirrors Storage. */
	export class $giper_baza_mine_fs_yym extends $mol_object2 {

		/** Memory allocator. */
		pool = new $mol_memory_pool
		
		/** Offsets of stored buffers. */
		offsets = new Map< ArrayBuffer, number >
		
		constructor(
			/** Yin & Yan mirrors files. */
			readonly sides: [ $mol_file, $mol_file ],
		) {
			super()
		}
		
		/** Prepare mirrors to read. */
		@ $mol_memo.method
		load_init() {
			const version = ( file: $mol_file )=> file.modified()?.valueOf() ?? Number.POSITIVE_INFINITY
			if( version( this.sides[0] ) > version( this.sides[1] ) ) this.sides.reverse()
		}
		
		/** Load whole data. */
		load() {
			this.load_init()
			const tx = this.sides[0].open( 'create', 'read_only' )
			const data = tx.read()
			tx.destructor()
			this.pool.acquire( data.byteLength )
			return data
		}
		
		/** Safe writes to both mirrors. */
		atomic( task: ( act: $giper_baza_mine_fs_yym_act )=> void ) {
			
			this.save_init()
			
			const act = new $giper_baza_mine_fs_yym_act( this )
			const tx1 = act.transaction = this.sides[1].open( 'create', 'write_only' )
			task( act )
			tx1.flush()
			tx1.destructor()
			
			this.sides.reverse()
			const tx2 = act.transaction = this.sides[1].open( 'create', 'write_only' )
			task( act )
			tx2.destructor()
			
		}
		
		/** Prepares mirrors to write. */
		@ $mol_memo.method
		save_init() {
			this.load_init()
			this.sides[0].clone( this.sides[1].path() )
		}
		
		@ $mol_mem
		empty() {
			this.load_init()
			return !this.sides[0].size()
		}
		
	}
	
	export class $giper_baza_mine_fs extends $giper_baza_mine {
		
		@ $mol_memo.method
		store() {
			
			const land = this.land().str
			const root = this.$.$mol_file.relative( '.baza' )
			const dir = root.resolve( land.slice( 0, 2 ) )
			dir.exists( true )
			
			return new $giper_baza_mine_fs_yym([
				dir.resolve( land + '.yin.baza' ),
				dir.resolve( land + '.yan.baza' ),
			])
			
		}
		
		@ $mol_memo.method
		store_init() {
			
			if( !this.store().empty() ) return
			
			const head = $giper_baza_pack.make([ [ this.land().str, new $giper_baza_pack_part ] ])
			this.store().atomic( side => side.save( head ) )
			
		}
		
		@ $mol_action
		override units_save( diff: $giper_baza_mine_diff ) {
			
			this.store_init()
			// console.log( 'diff', diff.del, diff.ins  )
			this.store().atomic( side => {
				
				for( const unit of diff.del ) side.free( unit )
				
				for( const unit of diff.ins ) {
					if( unit instanceof $giper_baza_unit_sand && unit.big() ) side.save( unit, unit.ball() )
					else side.save( unit )
				}
				
			} )
			
			for( const unit of diff.ins ) {
				this.units_persisted.add( unit )
			}
			
		}
		
		@ $mol_action
		override units_load() {
			
			const buf = this.store().load()
			if( !buf.length ) return []
			
			const pack = $giper_baza_pack.from( buf )
			
			const parts = new Map( pack.parts( this.store().offsets, this.store().pool ) )
			if( parts.size > 1 ) return $mol_fail( new Error( 'Wrong lands count', { cause: { count: parts.size } } ) )
			// console.log( this.land().str, JSON.stringify( this.store().pool, null, '  ' ) )
			for( const [ land, part ] of parts ) {
				if( land !== this.land().str ) return $mol_fail( new Error( 'Unexpected land', { cause: { expected: this.land().str, existen: land } } ) )
				console.log( 'offsets', this.store().offsets )
				
				for( const unit of part.units ) {
					this.units_persisted.add( unit )
					$giper_baza_unit_trusted_grant( unit )
				}
				
				return part.units
			}
			
			return []
		}
		
	}
	
}
