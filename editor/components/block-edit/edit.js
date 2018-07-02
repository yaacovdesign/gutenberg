/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { withFilters } from '@wordpress/components';
import { Fragment } from '@wordpress/element';
import { getBlockDefaultClassName, hasBlockSupport, getBlockType } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import BlockControls from '../block-controls';

export const Edit = ( props ) => {
	const { attributes = {}, name, setAttributes } = props;
	const blockType = getBlockType( name );

	if ( ! blockType ) {
		return null;
	}

	// Generate a class name for the block's editable form
	const generatedClassName = hasBlockSupport( blockType, 'className', true ) ?
		getBlockDefaultClassName( name ) :
		null;
	const className = classnames( generatedClassName, attributes.className );

	// `edit` and `save` are functions or components describing the markup
	// with which a block is displayed. If `blockType` is valid, assign
	// them preferentially as the render value for the block.
	const Component = blockType.edit || blockType.save;

	// The block can define a function that returns controls for the block toolbar,
	// which are reusable for multi-block selection.
	const getControls = blockType.controls;
	let controls;

	if ( undefined !== getControls ) {
		controls = getControls( attributes, setAttributes );
	}

	return (
		<Fragment>
			<Component
				{ ...props }
				className={ className }
			/>
			{ controls &&
				<BlockControls>
					{ controls }
				</BlockControls> }
		</Fragment>
	);
};

export default withFilters( 'editor.BlockEdit' )( Edit );
