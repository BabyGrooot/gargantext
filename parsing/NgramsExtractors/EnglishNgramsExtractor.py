from NgramsExtractors.NgramsExtractor import NgramsExtractor
from Taggers import NltkTagger


class EnglishNgramsExtractor(NgramsExtractor):

    def start(self):
        self.tagger = NltkTagger()
        