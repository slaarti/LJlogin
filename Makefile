all: ljlogin.xpi

ljlogin.xpi: chrome install.rdf chrome.manifest
	zip -r9 ljlogin.xpi install.rdf chrome.manifest chrome

chrome: chrome/ljlogin.jar

chrome/ljlogin.jar: content/contents.rdf content/ljlogin.xul \
                    content/ljlogin.js content/ljlogin.css \
		    content/loginas.xul
	if [ ! -d chrome ]; then mkdir chrome; fi
	zip -r0 chrome/ljlogin.jar content
	zip -d chrome/ljlogin.jar content/CVS/* content/CVS

clean:
	rm -f ljlogin.xpi chrome/ljlogin.jar
	if [ -d chrome ]; then rmdir chrome; fi
