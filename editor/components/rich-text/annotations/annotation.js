import { Component, Fragment } from '@wordpress/element';
import { isEqual, map } from 'lodash';

class Annotation extends Component {
	constructor( props ) {
		super( props );

		this.state = {
			prevAnnotation: this.props.annotation,
			isDirty: true,
			positions: [],
		};

		this.calculatePosition = this.calculatePosition.bind( this );
	}

	matchEditorXPath( xpath ) {
		const body = this.props.editor.getBody();

		const results = document.evaluate(
			xpath,
			body,
			null,
			XPathResult.UNORDERED_NODE_ITERATOR_TYPE
		);
		const firstResult = results.iterateNext();
		if ( firstResult ) {
			return firstResult;
		}

		return null;
	}

	createRange( startNode, endNode, startOffset, endOffset ) {
		const range = document.createRange();

		range.setStart( startNode, startOffset );
		range.setEnd( endNode, endOffset );

		return range;
	}

	calculatePosition() {
		const { annotation } = this.props;

		const {
			startXPath,
			startOffset,
			endXPath,
			endOffset,
		} = annotation;

		let startNode, endNode;

		try {
			startNode = this.matchEditorXPath( startXPath );
			endNode = this.matchEditorXPath( endXPath );
		} catch ( e ) {
			console.log( "Couldn't match XPath", e );
			return;
		}

		const range = this.createRange( startNode, endNode, startOffset, endOffset );
		const editorRect = this.props.containerRef.current.getBoundingClientRect();

		const positions = map( range.getClientRects(), ( rect ) => {
			return {
				width: rect.width,
				height: rect.height,
				top: rect.top - editorRect.top,
				left: rect.left - editorRect.left,
			};
		} );

		this.setState( {
			positions,
			prevAnnotation: this.props.annotation,
			isDirty: false,
		} );
	}

	updatePosition() {
		if ( this.state.isDirty ) {
			// Makes sure that this is not done synchronously on the same frame.
			setTimeout( this.calculatePosition, 10 );
		}
	}

	componentDidMount() {
		this.updatePosition();
	}

	componentDidUpdate() {
		this.updatePosition();
	}

	static getDerivedStateFromProps( props, state ) {
		if ( ! isEqual( props.annotation, state.prevAnnotation ) ) {
			return {
				isDirty: true,
			};
		}

		return {};
	}

	render() {
		const { annotation } = this.props;

		return <Fragment>
			<div className="annotation-marker-debug">
				{ JSON.stringify( this.props.annotation ) }
			</div>
			{ this.state.positions.map( ( position, index ) => {
				let {
					width,
					height,
					top,
					left,
				} = position;

				width = width + 'px';
				height = height + 'px';
				top = top + 'px';
				left = left + 'px';

				return <div
					className="annotation-marker"
					key={ annotation.id + '-' + index }
					style={ { width, height, top, left } }
				/>;
			} ) }
		</Fragment>;
	}
}

export default Annotation;
