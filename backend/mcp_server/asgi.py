"""
ASGI config for mcp_server project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import signaling.routing 

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mcp_server.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack( 
        URLRouter(
            signaling.routing.websocket_urlpatterns
        )
    ),
})
