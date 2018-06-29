/**
 * External dependencies
 */
import { groupBy } from 'lodash';

/**
 * Internal dependencies
 */
import TreeSelect from '../tree-select';

/**
 * Returns terms in a tree form.
 *
 * @param {Array} flatTerms  Array of terms in flat format.
 *
 * @return {Array} Array of terms in tree format.
 */
function buildTermsTree( flatTerms ) {
	const termsByParent = groupBy( flatTerms, 'parent' );
	const fillWithChildren = ( terms ) => {
		return terms.map( ( term ) => {
			const children = termsByParent[ term.id ];
			return {
				...term,
				children: children && children.length ?
					fillWithChildren( children ) :
					[],
			};
		} );
	};

	return fillWithChildren( termsByParent[ '0' ] || [] );
}

export default function CategorySelect( { label, noOptionLabel, categoriesList, selectedCategoryId, onChange } ) {
	const termsTree = buildTermsTree( categoriesList );
	return (
		<TreeSelect
			{ ...{ label, noOptionLabel, onChange } }
			tree={ termsTree }
			selectedId={ selectedCategoryId }
		/>
	);
}
