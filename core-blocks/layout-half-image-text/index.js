/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { Fragment } from '@wordpress/element';
import {
	InnerBlocks,
} from '@wordpress/editor';

/**
 * Internal dependencies
 */
import './style.scss';
import './editor.scss';

export const name = 'core/half-image';

export const children = [ {
	name: 'core/half-image-content-area',
	settings: {
		attributes: {
		},
		icon: 'columns',
		parent: [ 'core/half-image' ],

		category: 'layout',
		title: __( 'Half Image - Content Area' ),
		edit() {
			return (
				<div className="half-image__content-area">
					<InnerBlocks
						allowedBlocks={ [ 'core/button', 'core/paragraph', 'core/heading' ] }
						lock={ null }
					/>
				</div>
			);
		},
		save() {
			return (
				<div className="half-image__content-area">
					<InnerBlocks.Content />
				</div>
			);
		},
	},
} ];

export const settings = {
	title: __( 'Half Image' ),

	icon: 'columns',

	category: 'layout',

	attributes: {
	},

	supports: {
		align: [ 'wide', 'full' ],
	},

	edit() {
		return (
			<Fragment>
				<div className="half-image">
					<InnerBlocks
						template={ [
							[ 'core/columns', {}, [
								[ 'core/image', { layout: 'column-1' } ],
								[ 'core/half-image-content-area', { layout: 'column-2' }, [
									[ 'core/heading', { nodeName: 'h4' } ],
									[ 'core/paragraph' ],
								] ],
							] ],
						]
						}
						lock="all"
					/>
				</div>
			</Fragment>
		);
	},

	save() {
		return (
			<div className="half-image">
				<InnerBlocks.Content />
			</div>
		);
	},
};
