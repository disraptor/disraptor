VERSION=0.0.8

build-pypi-package:
	python3 -m build --sdist .
	python3 -m build --wheel .
	twine upload dist/discourse_client_in_disraptor-${VERSION}-py3-none-any.whl dist/discourse_client_in_disraptor-${VERSION}.tar.gz

