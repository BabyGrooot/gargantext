# Without this, we couldn't use the Django environment

import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "gargantext_web.settings")
os.environ.setdefault("DJANGO_HSTORE_GLOBAL_REGISTER", "False")


# We're gonna use all the models!

from node.models import *


# Node.objects.get(id=26514).children.all().make_metadata_filterable()
# exit()


# Reset: all data

tables_to_empty = [
    Node,
    Node_Metadata,
    Metadata,
    NodeType,
    ResourceType,
    Resource,
]
for table in tables_to_empty:
    print('Empty table "%s"...' % (table._meta.db_table, ))
    table.objects.all().delete()


# Integration: metadata types

print('Initialize metadata...')
metadata = {
    'publication_date': 'datetime',
    'authors': 'string',
    'language_fullname': 'string',
    'abstract': 'text',
    'title': 'string',
    'source': 'string',
    'volume': 'string',
    'text': 'text',
    'date': 'datetime',
    'page': 'string',
    'doi': 'string',
    'journal': 'string',
}
for name, type in metadata.items():
    Metadata(name=name, type=type).save()


# Integration: languages

print('Initialize languages...')
import pycountry
Language.objects.all().delete()
for language in pycountry.languages:
    if 'alpha2' in language.__dict__:
        Language(
            iso2 = language.alpha2,
            iso3 = language.bibliographic,
            fullname = language.name,
            implemented = 1 if language.alpha2 in ['en', 'fr'] else 0,
        ).save()

english = Language.objects.get(iso2='en')
french  = Language.objects.get(iso2='fr')


# Integration: users

print('Initialize users...')
try:
    me = User.objects.get(username='mat')
except:
    me = User(username='mat')
    me.save()


# Integration: node types

print('Initialize node types...')
try:
    typeProject = NodeType.objects.get(name='Project')
except Exception as error:
    print(error)
    typeProject = NodeType(name='Project')
    typeProject.save()  

try:
    typeCorpus  = NodeType.objects.get(name='Corpus')
except Exception as error:
    print(error)
    typeCorpus  = NodeType(name='Corpus')
    typeCorpus.save()
    
try:
    typeDoc     = NodeType.objects.get(name='Document')
except Exception as error:
    print(error)
    typeDoc     = NodeType(name='Document')
    typeDoc.save()


# Integration: resource types

print('Initialize resource...')
try:
    typePubmed = ResourceType.objects.get(name='pubmed')
    typeIsi    = ResourceType.objects.get(name='isi')
    typeRis    = ResourceType.objects.get(name='ris')
    typePresse = ResourceType.objects.get(name='europress')

except Exception as error:
    print(error)
    
    typePubmed = ResourceType(name='pubmed')
    typePubmed.save()  
    
    typeIsi    = ResourceType(name='isi')
    typeIsi.save()
    
    typeRis    = ResourceType(name='ris')
    typeRis.save()
    
    typePresse = ResourceType(name='europress')
    typePresse.save()


# Integration: project

print('Initialize project...')
try:
    project = Node.objects.get(name='Bees project')
except:
    project = Node(name='Bees project', type=typeProject, user=me)
    project.save()


# Integration: corpus

print('Initialize corpus...')
try:
    corpus_pubmed = Node.objects.get(name='PubMed corpus')
except:
    corpus_pubmed = Node(parent=project, name='PubMed corpus', type=typeCorpus, user=me)
    corpus_pubmed.save()

print('Initialize resource...')
corpus_pubmed.add_resource(
    # file='./data_samples/pubmed.zip',
    file='./data_samples/pubmed_2013-04-01_HoneyBeesBeeBees.xml',
    type=typePubmed,
    user=me
)

for resource in corpus_pubmed.get_resources():
    print('Resource #%d - %s - %s' % (resource.id, resource.digest, resource.file))
    
print('Parse corpus #%d...' % (corpus_pubmed.id, ))
corpus_pubmed.parse_resources(verbose=True)
print('Extract corpus #%d...' % (corpus_pubmed.id, ))
corpus_pubmed.children.all().extract_ngrams(['title',])
print('Parsed corpus #%d.' % (corpus_pubmed.id, ))

exit()