import http.server
import socketserver
#Copyright Notice
print("_____________________________________")
print("©Soxiety Technology Solutions")
print("Sandbox Environment v1.0-May-2025-HT")
print("_____________________________________")

print()

#Define Port Number
PORT = 8080

#Creating Handler
Handler = http.server.SimpleHTTPRequestHandler

# Creating TCPServer
http = socketserver.TCPServer(("", PORT), Handler)

#Logging Port
print("serving at port", PORT)
http.serve_forever()