from flask import Flask, jsonify, abort, render_template,url_for,request
import pandas as pd
import pickle
import joblib

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('home2.html')

df = pd.read_csv('SimilarityModel/data/export_SJA_nltk_complete.csv', sep = ';')
loaded_model = joblib.load('model.pkl')
indices = pd.Series(df.index, index=df['num']).drop_duplicates()

@app.route('/recommand/<int:num>', methods = ['GET'])
def recommand(num):
    idx = indices[num]
    sim_scores = list(enumerate(loaded_model[idx]))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
    sim_scores = sim_scores[1:11]
    item_indices = [i[0] for i in sim_scores]
    return df.iloc[item_indices,0:7].to_json(orient='records')

if __name__ == '__main__':
    app.run(debug=True)   