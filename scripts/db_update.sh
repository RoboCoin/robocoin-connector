LATEST_VERSION=$(node scripts/lastMigrationVersion.js)
for file in `ls scripts/db_updates | sort -V`
do
 FILE_NAME=$(basename $file)
 WITHOUT_EXTENSION="${FILE_NAME%.*}"
 if [ "$WITHOUT_EXTENSION" -gt "$LATEST_VERSION" ]
  then
   echo "Running " $file
   node scripts/runMigration.js $WITHOUT_EXTENSION
 fi
done
echo "Done"

