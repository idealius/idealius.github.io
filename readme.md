![Logo](/img/Spicy_Covid_Graphs_Logo.png)

<!--Link: (http://covid19graphs.42web.io/)-->

This is a working demo of this project locked in at 12/7/2020:

(https://idealius.github.io/)


### Purpose:
When doing personal risk assessment of COVID-19 in different contexts like local and global regions, other dashboards did not make it easy see regions overlayed and per population total. To rectify this would involve a lot of copy/pasting and data transposing in spreadsheets like Excel. The Python project listed in sources below is used to transpose Johns Hopkins data and convert it to rates. This makes the data easy to use in Tableau, Excel, etc.

Our current project then takes that data outputted from the Python project (which also converts the data to .js files) and allows one to quickly overlay different regions - by user selection - or by ranking by linear regressed slope across N number of days for cases or deaths.

### Features:
Always shows data as percentage of population, so comparisons between regions is easier, and conversion to population numbers or peopler per 100 million is trivial.

Rolling average slider.

Always fills curves transparently -- mostly for my own taste, but also because it is sometimes easier to visualize differences between regions.

Totals printed to text area for ranking comparison across N number of days.

Ranking in the graph by total or peak.

Ability to add N top regions in a dataset by last N number of days. For seeing, say the bottom 10 regions, one can add the top N regions, then remove the (N - 10) regions.

### FAQ:
Q. TBD 

A. TBD

### Major Bugs
12/1/2020: Firefox does not change the logo responsively to window.resize

### Recently Fixed Bugs
12/1/2020: Check pushes

### Superficial Bugs
12/1/2020: Mobile footer displays partly off the footer gradient

### Potential Enhancements
Zoom out show letters for months instead of abbreviations

Find way to change selected region curve on top (JSXGraph feature / limitation)

Add remove region by context functionality

Add dual axis for easier comparison of deaths to cases

Test mobile more

Add 'clear' button for text area

Test more mobile screen rotations

Add text box log for remove_top regions

Note why some colors are outlined in mobile on main page

Add Tabs

Add curve guessing using logarthmic regression that has decay

Mobile zoom: find a way to consolidate separate vert, horiz, and diagonal two finger zooming (JSXGraph feature / limitation)

Consider refactoring alt_axes to not include sub-functions for better memory management

Consider adding checkbox to switch x-axis styles

### Limitations
No hospitalization data.

Graphs are not displayed well on mobile platforms in general because the screen width & height of phones.

### Sources & Notes

#### Third party software packages:

This project uses JQuery (https://jquery.com/) and JSXGraph (https://jsxgraph.uni-bayreuth.de/wp/index.html) extensively 

#### This uses my Python data transposing project

(https://github.com/idealius/transpose_covid_timeseries)

#### Country Data

Johns Hopkins Death and Confirmed Cases Data:

(https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv) 

(https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv) 

#### State Data

Johns Hopkins Death and Confirmed Cases Data:

(https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv) 

(https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv) 


Thank you
