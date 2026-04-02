# Simple HTTP Server
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8000/")
$listener.Start()

Write-Host "Server running at http://localhost:8000/"
Write-Host "Press Ctrl+C to stop the server"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        # Handle request path
        $path = $request.Url.LocalPath
        if ($path -eq "/") {
            $path = "/order-review.html"
        }
        
        # Build file path
        $filePath = Join-Path "e:\payment-demo" $path
        
        # Check if file exists
        if (Test-Path $filePath -PathType Leaf) {
            # Read file content
            $content = Get-Content -Path $filePath -Raw
            
            # Set response headers
            $response.ContentType = "text/html"
            $response.ContentLength64 = [System.Text.Encoding]::UTF8.GetByteCount($content)
            
            # Write response content
            $output = $response.OutputStream
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
            $output.Write($bytes, 0, $bytes.Length)
            $output.Close()
        } else {
            # File not found
            $response.StatusCode = 404
            $response.Close()
        }
    }
} finally {
    $listener.Stop()
}