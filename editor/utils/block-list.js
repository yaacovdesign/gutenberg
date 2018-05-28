/**
 * External dependencies
 */
import { noop, omit } from 'lodash';

/**
 * WordPress dependencies
 */
import { Component, compose } from '@wordpress/element';
import {
	synchronizeBlocksWithTemplate,
} from '@wordpress/blocks';
import { withSelect, withDispatch } from '@wordpress/data';
import isShallowEqual from '@wordpress/is-shallow-equal';

/**
 * Internal dependencies
 */
import BlockList from '../components/block-list';

/**
 * An object of cached BlockList components
 *
 * @type {Object}
 */
const INNER_BLOCK_LIST_CACHE = {};

/**
 * Returns a BlockList component which is already pre-bound to render with a
 * given UID as its rootUID prop. It is necessary to cache these components
 * because otherwise the rendering of a nested BlockList will cause ancestor
 * blocks to re-mount, leading to an endless cycle of remounting inner blocks.
 *
 * @param {string}   uid                   Block UID to use as root UID of
 *                                         BlockList component.
 * @param {Function} renderBlockMenu       Render function for block menu of
 *                                         nested BlockList.
 *
 * @return {Component} Pre-bound BlockList component
 */
export function createInnerBlockList( uid, renderBlockMenu = noop ) {
	if ( ! INNER_BLOCK_LIST_CACHE[ uid ] ) {
		const InnerBlockListComponent = class extends Component {
			componentWillReceiveProps( nextProps ) {
				this.updateNestedSettings( {
					supportedBlocks: nextProps.allowedBlocks,
				} );
			}

			componentWillUnmount() {
				// If, after decrementing the tracking count, there are no
				// remaining instances of the component, remove from cache.
				if ( ! INNER_BLOCK_LIST_CACHE[ uid ][ 1 ]-- ) {
					delete INNER_BLOCK_LIST_CACHE[ uid ];
				}
			}

			componentDidMount() {
				INNER_BLOCK_LIST_CACHE[ uid ][ 1 ]++;
				this.updateNestedSettings();
				this.insertTemplateBlocks( this.props.template );
			}

			componentDidUpdate() {
				this.updateNestedSettings();
			}

			insertTemplateBlocks( template ) {
				const { block, insertBlocks } = this.props;
				if ( template && ! block.innerBlocks.length ) {
					// synchronizeBlocksWithTemplate( [], template ) parses the template structure,
					// and returns/creates the necessary blocks to represent it.
					insertBlocks( synchronizeBlocksWithTemplate( [], template ) );
				}
			}

			updateNestedSettings() {
				const { allowedBlocks, lock, parentLock, blockListSettings, updateNestedSettings } = this.props;
				const newSettings = {
					allowedBlocks,
					lock: lock === undefined ? parentLock : lock,
				};
				if ( ! isShallowEqual( blockListSettings, newSettings ) ) {
					updateNestedSettings( newSettings );
				}
			}

			render() {
				return (
					<BlockList
						rootUID={ uid }
						renderBlockMenu={ renderBlockMenu }
						{ ...omit(
							this.props, [
								'allowedBlocks',
								'block',
								'blockListSettings',
								'insertBlocks',
								'template',
								'updateNestedSettings',
							]
						) } />
				);
			}
		};

		const InnerBlockListComponentContainer = compose(
			withSelect( ( select ) => {
				const { getBlock, getBlockListSettings, getBlockRootUID, getLockedState } = select( 'core/editor' );
				return {
					block: getBlock( uid ),
					blockListSettings: getBlockListSettings( uid ),
					parentLock: getLockedState( getBlockRootUID( uid ) ),
				};
			} ),
			withDispatch( ( dispatch ) => {
				const { insertBlocks, updateBlockListSettings } = dispatch( 'core/editor' );
				return {
					insertBlocks( blocks ) {
						dispatch( insertBlocks( blocks, undefined, uid ) );
					},
					updateNestedSettings( settings ) {
						dispatch( updateBlockListSettings( uid, settings ) );
					},
				};
			} ),
		)( InnerBlockListComponent );

		INNER_BLOCK_LIST_CACHE[ uid ] = [
			InnerBlockListComponentContainer,
			0, // A counter tracking active mounted instances:
		];
	}

	return INNER_BLOCK_LIST_CACHE[ uid ][ 0 ];
}
