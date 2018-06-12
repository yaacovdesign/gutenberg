
/**
 * External dependencies
 */
import { every, filter, first } from 'lodash';

/**
 * Internal dependencies
 */
import { canInsertBlockType, getBlock, getBlockName, getBlockRootUID } from '../store/selectors';

const allowedBlocksMiddleware = ( store ) => ( next ) => ( action ) => {
	switch ( action.type ) {
		// on insert we allow the action if at least one of the blocks can be inserted filtering the other blocks
		case 'INSERT_BLOCKS': {
			if ( action.ignoreAllowedBlocksValidation ) {
				next( action );
				return;
			}
			const allowedBlocks =
			filter( action.blocks, ( block ) => block && canInsertBlockType( store.getState(), block.name, action.rootUID ) );
			if ( allowedBlocks.length ) {
				next( {
					...action,
					blocks: allowedBlocks,
				} );
			}
			return;
		}
		case 'MOVE_BLOCK_TO_POSITION': {
			const { fromRootUID, toRootUID, uid } = action;
			const blockName = getBlockName( store.getState(), uid );
			// currently the only constraint to move inside the same parent is locking
			// locking was already handled
			// it is not possible to use drag & drop if locking is active
			if ( toRootUID === fromRootUID || canInsertBlockType( store.getState(), blockName, toRootUID ) ) {
				next( action );
			}
			return;
		}
		case 'REPLACE_BLOCKS': {
			const rootUID = getBlockRootUID( store.getState(), first( action.uids ) );
			// replace is valid if the new blocks can be inserted in the root block
			// or if we had a block of the same type in the position of the block being replaced.
			const replaceIsValid = every( action.blocks, ( block, index ) => {
				if ( canInsertBlockType( store.getState(), block.name, rootUID ) ) {
					return true;
				}
				const uidBlockBeingReplaced = action.uids[ index ];
				const blockBeingReplaced = uidBlockBeingReplaced && getBlock( store.getState(), uidBlockBeingReplaced );
				return blockBeingReplaced && blockBeingReplaced.name === block.name;
			} );
			if ( replaceIsValid	) {
				next( action );
			}
			return;
		}
		default:
			next( action );
	}
};

export default allowedBlocksMiddleware;
