from flask import Flask, jsonify, abort, render_template,url_for,request
from flask_cors import CORS, cross_origin
from flask_caching import Cache
import urllib3
import pandas as pd
import pickle
import joblib
from py2neo import Graph
from json import dumps

cache = Cache(config={'CACHE_TYPE': 'simple'})

app = Flask(__name__)
cache.init_app(app)
CORS(app)

#config variables
app.config.from_object('config')
port = app.config['PORT']
host = app.config['HOST']

@app.route('/')
def home():
    return render_template('home.html')

df = pd.read_csv('notebooks/data/05_model_input/exemplaires_sja_nltk_complete.csv', sep = ';')
loaded_model = joblib.load('notebooks/data/06_models/model.pkl.compressed')
"""
Alternative if the model.pkl file is externalized :
from urllib.request import urlopen
url = EXTERNAL_URL_OF_PICKLE_FILE
loaded_model = joblib.load(urlopen(url))
"""
indices = pd.Series(df.index, index=df['num']).drop_duplicates()

@app.route('/recommand/<int:num>', methods = ['GET'])
def recommand(num):
    idx = indices[num]
    sim_scores = list(enumerate(loaded_model[idx]))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
    sim_scores = sim_scores[1:11]
    item_indices = [i[0] for i in sim_scores]
    return df.iloc[item_indices,0:7].to_json(orient='records')

##Infos de connexion à l'instance Neo4j (éventuellement remplacer les paramètres) et API route branchée sur Neo4j
#graph = Graph("bolt://localhost:7687", auth=("neo4j", "neo4j"))
#@app.route('/recommand-graph/<num>', methods = ['GET'])   
#def recommandByGraph(num):
#    query = """MATCH (d1:Doc {num: '"""+num+"""'})<-[:HAS_LOAN]-(l:Lecteur)-[:HAS_LOAN]->(d2:Doc) RETURN d2.num AS num, COUNT(*) AS usersWhoAlsoWatched ORDER BY usersWhoAlsoWatched DESC LIMIT 10"""
#    return dumps(graph.run(query).data())

##Alternative en cas de pb de connexion : API exploitant un export csv
@app.route('/recommand-graph-csv/<int:num>', methods = ['GET'])   
def recommand_from_graph(num):
    dfcsv = pd.read_csv('notebooks/data/07_model_output/export_from_graph.csv', sep = ',')
    return dumps(dfcsv.loc[dfcsv.source == num].sort_values('usersWhoAlsoWatched', ascending=False)[:10].to_dict(orient='records'))

if __name__ == '__main__':
    app.run(debug=True,port=port,host=host)    