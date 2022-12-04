const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const headers = {
  Accept: 'application/json, text/javascript',
  'X-Requested-With': 'XMLHttpRequest',
};

const maxPage = 42; //42
const url = 'https://www.influenceurs.tn/fr?c=0&page=';
const outputFilename = 'data/influencers.json';

const scrap = async () => {
  const urls = [...Array(maxPage)].map((_, i) => `${url} ${i}`);
  const requests = urls.map((url) => fetchInfluencers(url));
  return await Promise.all(requests);
};

const fetchInfluencers = async (url) => {
  try {
    const response = await axios.get(url, { headers });
    const html = `<table>${response.data.data}</table>`;
    const $ = cheerio.load(html);

    return await Promise.all(
      $('tr').map(async (_idx, el) => {
        return new Promise(async (resolve) => {
          const _el = $(el);
          const innerTable = _el
            .children('td:nth-child(2)')
            .children('table')
            .children('tbody')
            .children('tr');
          const link = innerTable.children('td:nth-child(2)').children('a').attr('href');
          if (!link) {
            resolve(null);
            return;
          }

          const more = await fetchInfluencer(link);

          const influencer = {
            id: _el.children('td:nth-child(1)').text(),
            photoURL: innerTable.children('td:nth-child(1)').children('img').attr('src'),
            instagramURL: `https://instagram.com/${link.split('/')[link.split('/').length - 1]}`,
            username: innerTable.children('td:nth-child(2)').children('a').text(),
            link,
            followers: _el.children(' td:nth-child(3)').text(),
            categories: _el
              .children(' td:nth-child(4)')
              .text()
              .replace('\n', '')
              .split(',')
              .map((c) => c.trim()),
            more,
          };

          resolve(influencer);
        });
      }),
    );
  } catch (error) {
    throw error;
  }
};

const fetchInfluencer = async (url) => {
  try {
    const response = await axios.get(url, { headers });
    const html = response.data;
    const $ = cheerio.load(html);

    return {
      posts: $('span.posts').text(),
      followings: $('span.followings').text(),
      fullName: $('span.full_name').text(),
      biography: $('span.biography').text(),
    };
  } catch (error) {
    throw error;
  }
};
scrap().then((result) => {
  const influencers = result.flat().filter((profile) => !!profile);

  fs.writeFile(outputFilename, JSON.stringify(influencers, null, 4), function (err) {
    if (err) {
      console.log(err);
    } else {
      console.log('JSON saved to ' + outputFilename);
    }
  });
});
