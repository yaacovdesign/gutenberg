<?php
/**
 * OpenGraph REST API: WP_REST_Block_OpenGraph_Controller class
 *
 * @package gutenberg
 * @since 3.x
 */

/**
 * Controller which provides REST endpoint for rendering a block.
 *
 * @since 3.x
 *
 * @see WP_REST_Controller
 */
class WP_REST_OpenGraph_Controller extends WP_REST_Controller {

	/**
	 * Constructs the controller.
	 *
	 * @access public
	 */
	public function __construct() {
		$this->namespace = 'gutenberg/v1';
		$this->rest_base = 'opengraph';
	}

	/**
	 * Registers the necessary REST API routes.
	 *
	 * @access public
	 */
	public function register_routes() {

		register_rest_route( $this->namespace, '/' . $this->rest_base, array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_preview' ),
				'permission_callback' => array( $this, 'get_preview_permissions_check' ),
				'args'                => array(
					'url' => array(
						'description'       => __( 'The URL of the resource for which to fetch oEmbed data.' ),
						'type'              => 'string',
						'required'          => true,
						'sanitize_callback' => 'esc_url_raw',
					),
				),
			),
		) );
	}

	/**
	 * Checks if current user can make an OpenGraph request.
	 *
	 * @since 3.x
	 *
	 * @return true|WP_Error True if the request has read access, WP_Error object otherwise.
	 */
	public function get_preview_permissions_check() {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'Sorry, you are not allowed to make OpenGraph requests.' ),
				array( 'status' => rest_authorization_required_code() )
			);
		}
		return true;
	}

	/**
	 * Callback for the OpenGraph API endpoint.
	 *
	 * Returns the JSON object for the item .
	 *
	 * @since 3.x
	 *
	 * @see gutenberg_opengraph
	 * @param WP_REST_Request $request Full data about the request.
	 * @return object|WP_Error response data or WP_Error on failure.
	 */
	public function get_preview( $request ) {
		$args = $request->get_params();

		// Insert the blog id, because when we fetch the preview's images into the
		// media library, the cached preview will reference their URLs and we'll need
		// to cache this preview per blog.
		$args['blog_id'] = get_current_blog_id();

		// Serve data from cache if set.
		unset( $args['_wpnonce'] );
		$cache_key = 'oembed_' . md5( serialize( $args ) );
		$data      = get_transient( $cache_key );
		$url       = $request['url'];

		if ( ! empty( $data ) ) {
			return $data;
		}

		$data = $this->generate_preview( $args );
		if ( ! $data ) {
			return new WP_Error( 'opengraph_invalid_url', get_status_header_desc( 404 ), array( 'status' => 404 ) );
		}

		/**
		 * Filters the OpenGraph TTL value (time to live).
		 *
		 * @since 3.x
		 *
		 * @param int    $time    Time to live (in seconds).
		 * @param string $url     The attempted URL.
		 */
		$ttl = apply_filters( 'rest_opengraph_ttl', DAY_IN_SECONDS, $url );

		set_transient( $cache_key, $data, $ttl );

		return $data;
	}

	private function generate_preview( $args ) {
		$url = $args['url'];
		$blog_id = $args['blog_id'];

		$request_args = array(
			'user-agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36',
		);

		$response = wp_remote_get( $url, $request_args );
		$response_obj = $response['http_response']->get_response_object();
		if ( is_wp_error( $response ) || ! $response_obj->success ) {
			return false;
		}

		// Get the URL from the response object, so we deal with the actual URL
		// that we ended up on.
		$url = $response_obj->url;
		$body = $response['body'];
		$data = array(
			'url' => $url,
		);

		// extract any OpenGraph data
		$matches = array();
		preg_match_all( '/<meta .*property="og:([a-z]+)" content="([^"]+)"/', $body, $matches );
		foreach ( $matches[1] as $index => $property ) {
			$data[ $property ] = $matches[2][ $index ];
		}

		if ( ! isset( $data['title'] ) || empty( $data['title'] ) ) {
			$match = array();
			preg_match( '|<title>(.+?)</title>|', $body, $match );
			if ( $match ) {
				$data['title'] = $match[1];
			} else {
				$data['title'] = $url;
			}
		}

		if ( ! isset( $data['description'] ) || empty( $data['description'] ) ) {
			$match = array();
			preg_match( '|<p.*>.+?</p>|', $body, $match );
			if ( $match ) {
				// first bunch of words in the first paragraph
				$extract = substr( strip_tags( $match[0] ), 0, 500 );
				$words = str_word_count( $extract, 1 );
				$data['description'] = join( ' ', array_slice( $words, 0, -1 ) ) . '...';
			}
		}

		foreach ( $data as $index => $value ) {
			$data[ $index ] = strip_tags( $value );
		}

		if ( ! isset( $data['image'] ) || empty( $data['image'] ) ) {
			$matches = array();
			preg_match_all( '|<img [^>]*src=["\']([^"\']+)["\']|', $body, $matches );
			if ( $matches ) {
				$parsed_url = parse_url( $url );
				$path_segments = explode( '/', $parsed_url['path'] );
				$base_path = $parsed_url['scheme'] . '://' . $parsed_url['host'] . join( '/', array_slice( $path_segments, 0, -1 ) ) . '/';
				$images = array();
				foreach ( $matches[1] as $imgsrc ) {
					// make full urls out of the image src
					if ( '//' === substr( $imgsrc, 0, 2 ) ) {
						$full_img_url = 'https:' . $imgsrc;
					} elseif ( '/' === substr( $imgsrc, 0, 1 ) ) {
						$full_img_url = $parsed_url['scheme'] . '://' . $parsed_url['host'] . $imgsrc;
					} elseif ( preg_match( '|^https?://.+|', $imgsrc ) ) {
						$full_img_url = $imgsrc;
					} else {
						$full_img_url = $base_path . $imgsrc;
					}
					$images[] = array( 'src' => strip_tags( $full_img_url ) );
				}
				$data['images'] = $images;
			}
		} else {
			$data['images'] = array( array( 'src' => strip_tags( $data['image'] ) ) );
			unset( $data['image'] );
		}
		return $data;
	}
}
