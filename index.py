from dash import Dash, dcc, html, Input, Output, State
import dash_bootstrap_components as dbc
import pandas as pd

class MainApplication:
    def __init__(self):
        self.__app = Dash(
            external_stylesheets=[dbc.themes.BOOTSTRAP], suppress_callback_exceptions=True
        )

    @property
    def app(self):
        return self.__app


Application = MainApplication()
app = Application.app.server

# load dataframe
df = pd.read_csv("assets/od_footprints_random.csv")
df["total"] = df["footprint_main_leg"] + df["station_footprint_start"] + df["station_footprint_end"] + df["rab_dif_footprint_start"] + df["rab_dif_footprint_end"]

# Initialisation de l'application

app.title = "Mobiversité"

img = {
    "train": "assets/train.png",
    "plane": "assets/plane.png",
    "car": "assets/car.png"
}

all_options = [
    {'label': place.capitalize() if len(place) < 21 else place[:18].capitalize() + "...", 'value': place} for place in sorted(set(df["gtfs_station_name_start"]).union(set(df["gtfs_station_name_end"])))
]

# Définition du layout
Application.app.layout = html.Div(
    [
        html.Header([
            html.Img(src="assets/logo.png", alt="Logo", width="75", id="logo"),
            html.H1("Mobiversité", id="page-title"),
            html.H3("Maitrisez l'impact de votre mobilité sur la biodiversité", id="page-subtitle")
        ]),
        html.Main([
            html.Div([      
                html.Div([
                html.Label('Origine'),
                dcc.Dropdown(
                    id='origine-select',
                    options=all_options,
                    value=all_options[0]['value'],
                    clearable=False,
                    style={'white-space': 'nowrap'}
                ),
            ], id='origine'),
            html.Div([
                html.Label('Destination'),
                dcc.Dropdown(
                    id='destination-select',
                    options=all_options,
                    value=all_options[1]['value'],
                    clearable=False,
                    style={'white-space': 'nowrap'}
                ),
            ], id='destination'),],
                     id='header-content'),    
            html.Div(id='main-content')
        ], id="main"),
        html.Footer([
            "Valeurs aléatoire pour démonstration - Projet Datathon SNCF - 2023"
        ])
    ]
)

act_n_train = 0
act_n_car = 0
act_n_plane = 0

@Application.app.callback(
    Output("train_collapse", "is_open"),
    [Input("train_article", "n_clicks")],
    [State("train_collapse", "is_open")]
)
def toggle_collapse_train(n, is_open):
    if n:
        return not is_open
    return is_open

@Application.app.callback(
    Output("car_collapse", "is_open"),
    [Input("car_article", "n_clicks")],
    [State("car_collapse", "is_open")]
)
def toggle_collapse_car(n, is_open):
    if n:
        return not is_open
    return is_open

@Application.app.callback(
    Output("plane_collapse", "is_open"),
    [Input("plane_article", "n_clicks")],
    [State("plane_collapse", "is_open")]
)
def toggle_collapse_place(n, is_open):
    if n:
        return not is_open
    return is_open

@Application.app.callback(
    Output('destination-select', 'options'),
    Output('destination-select', 'value'),
    [Input('origine-select', 'value')]
)
def update_destination_options(selected_origine):
    options = sorted(set(df[df["gtfs_station_name_start"] == selected_origine]["gtfs_station_name_end"].unique()).union(set(df[df["gtfs_station_name_end"] == selected_origine]["gtfs_station_name_start"].unique())))
    options = [{'label': place.capitalize() if len(place) < 21 else place[:18].capitalize() + "...", 'value': place} for place in options]
    return options, options[0]["value"]

@Application.app.callback(
    Output(component_id='main-content', component_property='children'),
    Input(component_id='origine-select', component_property='value'),
    Input(component_id='destination-select', component_property='value')
)
def update_main_content(origine_value, destination_value):
    # Filtrer le DataFrame en fonction des valeurs sélectionnées pour l'origine et la destination
    filtered_df = df[((df["gtfs_station_name_start"] == origine_value) & (df["gtfs_station_name_end"] == destination_value)) | ((df["gtfs_station_name_start"] == destination_value) & (df["gtfs_station_name_end"] == origine_value))]

    # Supprimer les doublons
    filtered_df = filtered_df.drop_duplicates(subset=["mode"])

    # Trier le DataFrame en fonction de l'ordre des modes de transport
    orders = img.keys()
    filtered_df = filtered_df.sort_values(by=["mode"], key=lambda x: x.map({k: v for v, k in enumerate(orders)}))

    if filtered_df.empty:
        return html.Div([
            html.P("Aucun résultat pour cette recherche")
        ])
    # Obtenir la valeur maximale pour calculer la largeur des barres de progression
    max_value = filtered_df["total"].max()
    
    page_width = 800
    # Générer la nouvelle liste d'éléments HTML
    new_children = [
        html.H5("Surface au sol utilisée par trajet et par voyageur, selon le mode de transport principal"),
        html.P()
    ] + [
        html.Section([
            html.B({"train": "Train", "car":"Voiture", "plane": "Avion"}[row["mode"]], style={"margin-left":"70px"}),
            html.Article([
                html.Img(src=img[row["mode"]], alt=row["mode"], width="40px", height="40px"),
                html.Div([
                    html.Span(style={"width": str((row["total"]) / max_value * page_width) + "px", "background-color": "#0088CE"}),
                ], className="animated-progress", role="progressbar", style={"width": str((row["total"]) / max_value * page_width + 10) + "px"}),
                html.Div([
                    html.B("{0:.2g}".format(row["total"]))," m² / voyageur"
                ], className="progress-label", style={'white-space': 'nowrap'})
            ], id = row["mode"] + "_article"),
            dbc.Collapse(
                dbc.Card(dbc.CardBody(
                    [
                        html.Div([
                            "Rabattement : ",
                            html.B("{0:.2g}".format(row["rab_dif_footprint_start"])),
                            " m² / voyageur"
                        ]) if row["mode"] != "car" else "",
                        html.Div([
                            "Gare de départ : " if row["mode"] == "train" else "Aéroport de départ : ",
                            html.B("{0:.2g}".format(row["station_footprint_start"])),
                            " m² / voyageur"
                        ]) if row["mode"] != "car" else "",
                        html.Div([
                            "Trajet principal : ",
                            html.B("{0:.2g}".format(row["footprint_main_leg"])),
                            " m² / voyageur"
                        ]),
                        html.Div([
                            "Gare d'arrivée : " if row["mode"] == "train" else "Aéroport d'arrivée' : ",
                            html.B("{0:.2g}".format(row["station_footprint_end"])),
                            " m² / voyageur"
                        ]) if row["mode"] != "car" else "",
                        html.Div([
                            "Diffusion : ",
                            html.B("{0:.2g}".format(row["rab_dif_footprint_end"])),
                            " m² / voyageur",
                        ]) if row["mode"] != "car" else ""
                        
        ])),
                id=row["mode"] + "_collapse",
            )
        ]) for index, row in filtered_df.iterrows()
    ]

    return new_children


# Exécution de l'application
if __name__ == '__main__':
    Application.app.run_server(debug=True)