<script>
// Single loader script
(function() {
    const scripts = [
        'https://pdfformeditorpro.in/media/fontkit.umd.min.js',
        'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
        'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
        'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js',
        'https://pdfformeditorpro.in/media/jspdf.umd.min.js',
        'https://pdfformeditorpro.in/media/pdf.min.js',
        'https://pdfformeditorpro.in/media/Run.js',
        'https://pdfformeditorpro.in/media/Run2.js',
        'https://pdfformeditorpro.in/media/Run3.js',
        'https://pdfformeditorpro.in/Run4.js',
        'https://pdfformeditorpro.in/media/opentype.min.js',
        'https://pdfformeditorpro.in/media/pdf-lib.min.js',
        'https://pdfformeditorpro.in/media/tesseract.min.js',
        'https://pdfformeditorpro.in/media/jszip.min.js',
        'https://pdfformeditorpro.in/media/FileSaver.min.js'
    ];
    
    let loadedCount = 0;
    
    scripts.forEach(src => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            loadedCount++;
            if (loadedCount === scripts.length) {
                // All scripts loaded
                window.dispatchEvent(new Event('all-scripts-loaded'));
            }
        };
        document.head.appendChild(script);
    });
})();
</script>