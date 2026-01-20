namespace $ {
	
	export class $giper_baza_app_home_node extends $giper_baza_app_home {
		
		@ $mol_mem
		init() {
			
			const admin = $mol_state_arg.value( 'admin' )
			if( admin ) {
				const pass = $giper_baza_auth_pass.from( admin )
				this.land().give( pass, $giper_baza_rank_rule )
			}
			
			this.title( process.env.DOMAIN || $node.os.hostname() )
			
			this.Ips(null)!.items( this.ips() )
			
		}
		
		@ $mol_mem
		ips() {
			const ips = [] as string[]
			for( const group of Object.values( $node.os.networkInterfaces() ) ) {
				for( const face of group! ) {
					if( face.internal ) continue
					ips.push( face.address )
				}
			}
			return ips
		}
		
	}
	
	$.$giper_baza_app_home = $giper_baza_app_home_node
	
}
