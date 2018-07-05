import { Component } from '@wordpress/element';
import Annotation from './annotation';

class Annotations extends Component {
	render() {
		const { annotations } = this.props;

		// Don't try to render annotations while we don't have an editor.
		if ( ! this.props.editor ) {
			return null;
		}

		return <div className="annotation-markers">
			{ annotations.map( ( annotation ) => {
				return <Annotation
					key={ annotation.id }
					annotation={ annotation }
					containerRef={ this.props.containerRef }
					editor={ this.props.editor }
				/>;
			} ) }
		</div>;
	}
}

export default Annotations;
