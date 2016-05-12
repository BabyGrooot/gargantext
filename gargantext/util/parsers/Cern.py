from ._Parser import Parser
from datetime import datetime
from bs4 import BeautifulSoup
from lxml import etree

class CernParser(Parser):
    #mapping MARC21 ==> hyperdata
    MARC21 = {
            #here main author
            "100":{
                    "a": "authors",
                    "v": "authors_affiliations",
                    "w": "authors_countries",
                    "m": "authors_mails",
                    },
            #here cooauthor mais rappatrié vers la list  l'auteur avec main author [0]
            "700": {
                    "a": "authors",
                    "v": "authors_affiliations",
                    "w": "authors_countries",
                    },
            "773":{
                    "c": "pages",
                    "n": "issue",
                    "p": "journal",
                    "v": "volume",
                    "y": "publication_year"
                    },
            "024": {"a":"doi"},
            #"037": {"a":"arxiv"},
            #"022": {"a":"isbn"},
            "245": {"a":"title"},
            "520": {"a":"abstract"},
            "260": {"b":"publisher","c":"publication_date"},
            "024": {"t":"realdate_full_"}, #correspond to query date
            #"540": {"a":"licence"},
            #"653": {"a":"keywords"},
            "856": {"u":"pdf_source"},
            }

    def format_date(self, hyperdata):
        '''formatting pubdate'''
        prefix = "publication"
        date = datetime.strptime(hyperdata[prefix + "_date"], "%Y-%m-%d")
        hyperdata[prefix + "_year"]      = date.strftime('%Y')
        hyperdata[prefix + "_month"]     = date.strftime("%m")
        hyperdata[prefix + "_day"]       = date.strftime("%d")
        hyperdata[prefix + "_hour"]      = date.strftime("%h")
        hyperdata[prefix + "_minute"]    = date.strftime("%m")
        hyperdata[prefix + "_second"]    = date.strftime("%s")
        hyperdata[prefix + "_date"]  = date.strftime("%Y-%m-%d %H:%M:%S")
        return hyperdata

    def parse(self, file):
        hyperdata_list = []
        doc = file.read()
        soup = BeautifulSoup(doc.decode("utf-8"), "lxml")
        for record in soup.find_all("record"):
            hyperdata = {v:[] for v in self.MARC21["100"].values()}
            hyperdata["uid"] = soup.find("controlfield").text
            hyperdata["language_iso2"] = "en"
            for data in soup.find_all("datafield"):
                tag = data.get("tag")
                if tag in self.MARC21.keys():
                    for sub in data.find_all("subfield"):
                        code = sub.get("code")
                        if code in self.MARC21[tag].keys():
                            if tag == "100":
                                try:
                                    hyperdata[self.MARC21["100"][code]].insert(0,sub.text)
                                except AttributeError:
                                    hyperdata[self.MARC21["100"][code]] = [sub.text]
                                #print ("1", self.MARC21["100"][code], hyperdata[self.MARC21["100"][code]])

                            elif tag == "700":
                                #print ("7", self.MARC21["100"][code], hyperdata[self.MARC21["100"][code]])
                                try:
                                    hyperdata[self.MARC21["100"][code]].append(sub.text)
                                except AttributeError:
                                    hyperdata[self.MARC21["100"][code]] = [sub.text]
                            else:
                                hyperdata[self.MARC21[tag][code]] = sub.text

            hyperdata["authors_countries"] = (",").join(hyperdata["authors_countries"])
            hyperdata["authors_affiliations"] = (",").join(hyperdata["authors_affiliations"])
            hyperdata["authors"] = (",").join(hyperdata["authors"])
            hyperdata["authors_mails"] = (",").join(hyperdata["authors_mails"])
            hyperdata = self.format_date(hyperdata)
            hyperdata_list.append(hyperdata)
        return hyperdata_list

if __name__ == "__main__":
    pass
