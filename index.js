require('dotenv').config()
const express = require('express')
const puppeteer = require('puppeteer')
const app = express()

// Middleware to parse JSON bodies
app.use(express.json({ limit: '10mb' }))

app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to the HTML to PDF Conversion Service',
    status: 'online',
    version: '1.0.0',
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      'GET /': 'Service information and health check',
      'POST /files': 'Convert HTML string to PDF file (direct download)'
    }
  })
})

app.post('/files', async (req, res) => {
  try {
    // Validate request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Request body is missing. Please provide an HTML field in the request body.',
        code: 'MISSING_REQUEST_BODY',
        example: {
          html: "<html><body><h1>Your HTML content here</h1></body></html>"
        }
      })
    }

    const { html } = req.body
    
    if (html === undefined || html === null) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'HTML field is missing from request body.',
        code: 'MISSING_HTML_FIELD',
        received: Object.keys(req.body),
        expected: 'html',
        example: {
          html: "<html><body><h1>Your HTML content here</h1></body></html>"
        }
      })
    }

    if (typeof html !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: `HTML field must be a string, but received ${typeof html}.`,
        code: 'INVALID_HTML_TYPE',
        received: {
          type: typeof html,
          value: html
        },
        expected: 'string',
        example: {
          html: "<html><body><h1>Your HTML content here</h1></body></html>"
        }
      })
    }

    if (html.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'HTML content cannot be empty or contain only whitespace.',
        code: 'EMPTY_HTML_CONTENT',
        example: {
          html: "<html><body><h1>Your HTML content here</h1></body></html>"
        }
      })
    }

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    try {
      const page = await browser.newPage()
      
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      })

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        }
      })

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `document-${timestamp}.pdf`

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.setHeader('Content-Length', pdfBuffer.length)
      res.setHeader('Cache-Control', 'no-cache')
      
      res.send(pdfBuffer)

    } finally {
      await browser.close()
    }

  } catch (error) {
    console.error('PDF conversion error:', error)
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to convert HTML to PDF',
      code: 'PDF_CONVERSION_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

app.use((error, req, res, next) => {
  console.error('Unhandled error:', error)
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    code: 'UNHANDLED_ERROR'
  })
})

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    code: 'ROUTE_NOT_FOUND'
  })
})

// Use PORT from environment variable (required for GCP Cloud Run, Heroku, etc.)
// Falls back to 3000 for local development
const PORT = process.env.PORT || 3000

app.listen(PORT, '0.0.0.0', () => {
  console.log(`HTML to PDF Service running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`Health check: http://localhost:${PORT}/`)
  console.log(`Convert endpoint: POST http://localhost:${PORT}/files`)
})


