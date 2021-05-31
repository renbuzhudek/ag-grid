#!/usr/bin/env bash

if [ "$#" -lt 1 ]
  then
    echo "You must supply a release version number"
    echo "For example: ./scripts/release/createDocsReleaseBundle.sh 19.1.2"
    exit 1
fi

RAW_VERSION=$1
VERSION=""${RAW_VERSION//./}""

echo "Starting Archive Docs Bundle Process"
cd grid-packages/ag-grid-docs

echo "Gatsby Archive Package"
cd documentation
GATSBY_HOST=www.ag-grid.com GATSBY_ROOT_DIRECTORY="/archive/$RAW_VERSION" npm run package
cd ..

echo "Building Docs Archive"
npx gulp release-archive
cd ../../

ARCHIVE_FILENAME="archive_`date +%Y%m%d`_$RAW_VERSION.tar"
node scripts/release/createDocsArchiveBundle.js $RAW_VERSION $ARCHIVE_FILENAME

echo "Gzipping $ARCHIVE_FILENAME"
gzip --force $ARCHIVE_FILENAME

echo "Archive Created: $ARCHIVE_FILENAME.gz"

