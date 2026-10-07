# `make` runs recipes. This one has a very important recipe.
# (A classic: https://xkcd.com/149/)

.PHONY: me a sandwich

me a:
	@:

sandwich:
	@if [ "$$(id -u)" -eq 0 ]; then \
		echo "Okay."; \
		echo; \
		echo "      _____________"; \
		echo "     /   bread    /"; \
		echo "    /~~ cheese ~~/"; \
		echo "   / ~ tomato ~ /"; \
		echo "  /  lettuce   /"; \
		echo " /____bread___/"; \
		echo; \
	else \
		echo "What? Make it yourself."; \
	fi
