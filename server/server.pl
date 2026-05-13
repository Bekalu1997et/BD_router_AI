:- use_module(library(http/thread_httpd)).
:- use_module(library(http/http_dispatch)).
:- use_module(library(http/http_parameters)).
:- use_module(library(http/http_json)).
:- use_module(library(http/http_cors)).
:- use_module(library(lists)).

% Enable CORS for all origins
:- set_setting(http:cors, [*]).

% Starts the HTTP server on the given port
server(Port) :-
    http_server(http_dispatch, [port(Port)]).

% Main entry point that keeps the server running
main :-
    server(8080),
    % Keep the main thread alive forever
    repeat,
    sleep(1),
    fail.

% Start server immediately when the script is loaded
:- initialization(main).

% Define the route
:- http_handler(root(route), route_handler, []).

% Provide list of nodes and coordinates
:- http_handler(root(nodes), nodes_handler, []).

% Nearest node lookup by lat/lng
:- http_handler(root(nearest), nearest_handler, []).

% HTTP handler for /route?start=Node&goal=Node
route_handler(Request) :-
    cors_enable,
    catch(
        (
            http_parameters(Request, [
                start(Start, [atom]),
                goal(Goal, [atom])
            ]),
            (   astar(Start, Goal, Path, Cost)
            ->  reply_json_dict(_{path: Path, cost: Cost})
            ;   reply_json_dict(_{error: "No path found"})
            )
        ),
        _,
        (
            % In case of missing parameters or other errors
            reply_json_dict(_{error: "Invalid request parameters"})
        )
    ).

nodes_handler(_Request) :-
    cors_enable,
    catch(
        (
            findall(_{name: Name, lat: Lat, lng: Lng}, node_coords(Name, Lat, Lng), Nodes),
            reply_json_dict(_{nodes: Nodes})
        ),
        _,
        reply_json_dict(_{error: "Unable to retrieve nodes"})
    ).

nearest_handler(Request) :-
    cors_enable,
    catch(
        (
            http_parameters(Request, [
                lat(Lat, [number]),
                lng(Lng, [number])
            ]),
            findall(Dist-Name, (
                node_coords(Name, NLat, NLng),
                haversine(NLat, NLng, Lat, Lng, Dist)
            ), Pairs),
            sort(Pairs, Sorted),
            (   Sorted = [MinDist-Nearest|_]
            ->  reply_json_dict(_{node: Nearest, distance_km: MinDist})
            ;   reply_json_dict(_{error: "No nodes available"})
            )
        ),
        _,
        reply_json_dict(_{error: "Invalid parameters for nearest lookup"})
    ).

% --- A* Search Algorithm ---

% astar(Start, Goal, Path, Cost)
astar(Start, Goal, Path, Cost) :-
    h(Start, Goal, H),
    astar_search([H-[Start, 0, [Start]]], Goal, [], RevPath, Cost),
    reverse(RevPath, Path).

% astar_search(OpenList, Goal, ClosedList, Path, Cost)

% 1. Goal reached.
astar_search([_-[Goal, Cost, Path] | _], Goal, _, Path, Cost) :- !.

% 2. Node already in closed list (skip it to avoid revisiting).
astar_search([_-[Current, _, _] | RestOpen], Goal, Closed, FinalPath, FinalCost) :-
    member(Current, Closed),
    !,
    astar_search(RestOpen, Goal, Closed, FinalPath, FinalCost).

% 3. Expand current node.
astar_search([_-[Current, G, Path] | RestOpen], Goal, Closed, FinalPath, FinalCost) :-
    findall(
        FNew-[NextNode, GNew, [NextNode|Path]],
        (
            edge(Current, NextNode, StepCost),
            \+ member(NextNode, Closed),
            GNew is G + StepCost,
            h(NextNode, Goal, HNew),
            FNew is GNew + HNew
        ),
        Children
    ),
    append(RestOpen, Children, UnsortedOpen),
    keysort(UnsortedOpen, NewOpen), % Priority queue ordered by F = G + H
    astar_search(NewOpen, Goal, [Current | Closed], FinalPath, FinalCost).


% --- Graph Definition ---

% edge(Node1, Node2, Cost) - Bidirectional connections for exactly 15 locations
edge(bahir_dar_university, poly_technic, 2).
edge(poly_technic, bahir_dar_university, 2).

edge(poly_technic, felege_hiwot_hospital, 4).
edge(felege_hiwot_hospital, poly_technic, 4).

edge(felege_hiwot_hospital, bus_station, 2).
edge(bus_station, felege_hiwot_hospital, 2).

edge(bus_station, main_market, 2).
edge(main_market, bus_station, 2).

edge(main_market, main_roundabout, 2).
edge(main_roundabout, main_market, 2).

edge(main_roundabout, telecom_office, 2).
edge(telecom_office, main_roundabout, 2).

edge(telecom_office, commercial_bank, 2).
edge(commercial_bank, telecom_office, 2).

edge(main_roundabout, stadium, 2).
edge(stadium, main_roundabout, 2).

edge(stadium, blue_nile_hotel, 2).
edge(blue_nile_hotel, stadium, 2).

edge(blue_nile_hotel, ghion_hotel, 2).
edge(ghion_hotel, blue_nile_hotel, 2).

edge(ghion_hotel, tana_hotel, 2).
edge(tana_hotel, ghion_hotel, 2).

edge(tana_hotel, lake_tana, 2).
edge(lake_tana, tana_hotel, 2).

edge(lake_tana, airport, 15).
edge(airport, lake_tana, 15).

edge(airport, abay_bridge, 7).
edge(abay_bridge, airport, 7).

edge(main_roundabout, abay_bridge, 7).
edge(abay_bridge, main_roundabout, 7).

edge(commercial_bank, lake_tana, 5).
edge(lake_tana, commercial_bank, 5).

edge(bus_station, stadium, 5).
edge(stadium, bus_station, 5).

edge(bahir_dar_university, abay_bridge, 8).
edge(abay_bridge, bahir_dar_university, 8).

% --- Heuristic Function ---

% GPS coordinates for the heuristic
node_coords(bahir_dar_university, 11.5933, 37.3900).
node_coords(stadium, 11.5900, 37.3870).
node_coords(main_market, 11.5880, 37.3920).
node_coords(lake_tana, 11.6000, 37.3800).
node_coords(blue_nile_hotel, 11.5920, 37.3950).
node_coords(tana_hotel, 11.5910, 37.3880).
node_coords(ghion_hotel, 11.5895, 37.3860).
node_coords(airport, 11.6080, 37.4210).
node_coords(felege_hiwot_hospital, 11.5870, 37.3840).
node_coords(abay_bridge, 11.5850, 37.3910).
node_coords(commercial_bank, 11.5875, 37.3935).
node_coords(telecom_office, 11.5865, 37.3925).
node_coords(poly_technic, 11.5945, 37.3855).
node_coords(bus_station, 11.5840, 37.3890).
node_coords(main_roundabout, 11.5890, 37.3900).

% Standard Haversine formula to compute distance between two GPS coordinates in km
haversine(Lat1, Lng1, Lat2, Lng2, DistanceKm) :-
    Lat1Rad is Lat1 * pi / 180,
    Lng1Rad is Lng1 * pi / 180,
    Lat2Rad is Lat2 * pi / 180,
    Lng2Rad is Lng2 * pi / 180,
    DLat is Lat2Rad - Lat1Rad,
    DLng is Lng2Rad - Lng1Rad,
    A is sin(DLat/2)**2 + cos(Lat1Rad) * cos(Lat2Rad) * sin(DLng/2)**2,
    C is 2 * atan2(sqrt(A), sqrt(1-A)),
    DistanceKm is 6371 * C.

% h(Node, Goal, H)
% Estimates distance using the Haversine formula
h(Node, Goal, H) :-
    (   node_coords(Node, Lat1, Lng1),
        node_coords(Goal, Lat2, Lng2)
    ->  haversine(Lat1, Lng1, Lat2, Lng2, H)
    ;   H = 0  % Fallback if node not found
    ).
