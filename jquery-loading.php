function pwmp_fix_jquery_frontend() {
    if ( ! is_admin() ) {
        wp_deregister_script('jquery');

        wp_register_script(
            'jquery',
            includes_url('/js/jquery/jquery.min.js'),
            array(),
            null,
            false
        );

        wp_enqueue_script('jquery');
    }
}
add_action('wp_enqueue_scripts', 'pwmp_fix_jquery_frontend', 1);
