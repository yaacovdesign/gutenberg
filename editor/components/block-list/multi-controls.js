/**
 * External dependencies
 */
import { first, last, uniq } from 'lodash';

/**
 * WordPress dependencies
 */
import { withSelect, withDispatch } from '@wordpress/data';
import { getBlockType } from '@wordpress/blocks';
import { compose } from '@wordpress/element';

/**
 * Internal dependencies
 */
import BlockMover from '../block-mover';
import BlockSettingsMenu from '../block-settings-menu';
import MultiBlocksSwitcher from '../block-switcher/multi-blocks-switcher';

function reduceAttributes( multiSelectedBlocks ) {
	const attributes = {};
	// Reduce the selected block's attributes, so if they all have the
	// same value for an attribute, we get it in the multi toolbar attributes.
	for ( let i = 0; i < multiSelectedBlocks.length; i++ ) {
		const block = multiSelectedBlocks[ i ];
		for ( const attr in block.attributes ) {
			if ( block.attributes[ attr ] === attributes[ attr ] || 0 === i ) {
				attributes[ attr ] = block.attributes[ attr ];
			} else {
				attributes[ attr ] = undefined;
			}
		}
	}
	return attributes;
}

function BlockListMultiControls( { multiSelectedBlockUids, multiSelectedBlocks, rootUID, isSelecting, isFirst, isLast, onChange } ) {
	if ( isSelecting ) {
		return null;
	}

	const names = uniq( multiSelectedBlocks.map( ( { name } ) => name ) );
	let controls;

	if ( 1 === names.length ) {
		const getControls = getBlockType( names[ 0 ] ).controls;
		const setAttributes = ( newAttibutes ) => {
			for ( let i = 0; i < multiSelectedBlocks.length; i++ ) {
				const uid = multiSelectedBlocks[ i ].uid;
				onChange( uid, newAttibutes );
			}
		};
		if ( undefined !== getControls ) {
			controls = getControls( reduceAttributes( multiSelectedBlocks ), setAttributes );
		}
	}

	return [
		<MultiBlocksSwitcher key="switcher" />,
		controls,
		<BlockMover
			key="mover"
			rootUID={ rootUID }
			uids={ multiSelectedBlockUids }
			isFirst={ isFirst }
			isLast={ isLast }
		/>,
		<BlockSettingsMenu
			key="menu"
			rootUID={ rootUID }
			uids={ multiSelectedBlockUids }
			focus
		/>,
	];
}

const applyWithDispatch = withDispatch( ( dispatch ) => {
	const {
		updateBlockAttributes,
	} = dispatch( 'core/editor' );

	return {
		onChange( uid, attributes ) {
			updateBlockAttributes( uid, attributes );
		},
	};
} );

const applyWithSelect = withSelect( ( select, { rootUID } ) => {
	const {
		getMultiSelectedBlockUids,
		getMultiSelectedBlocks,
		isMultiSelecting,
		getBlockIndex,
		getBlockCount,
	} = select( 'core/editor' );
	const uids = getMultiSelectedBlockUids();
	const firstIndex = getBlockIndex( first( uids ), rootUID );
	const lastIndex = getBlockIndex( last( uids ), rootUID );

	return {
		multiSelectedBlockUids: uids,
		multiSelectedBlocks: getMultiSelectedBlocks(),
		isSelecting: isMultiSelecting(),
		isFirst: firstIndex === 0,
		isLast: lastIndex + 1 === getBlockCount(),
	};
} );

export default compose(
	applyWithSelect,
	applyWithDispatch,
)( BlockListMultiControls );
