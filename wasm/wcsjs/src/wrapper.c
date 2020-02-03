#include <stdio.h>
#include <wcslib/wcshdr.h>
#include <wcslib/wcs.h>

struct wcsprm *getWcs(char *header, int nkeyrec)
{
	int relax = WCSHDR_all, ctrl = 0;
	int nreject, nwcs;
	struct wcsprm *wcs;

	int retCode = wcspih(header, nkeyrec, relax, ctrl, &nreject, &nwcs, &wcs);
	// printf("HERE LNG LAT %d %d", wcs->lng, wcs->lat);
	// printf("HERE2: %d, %d, %d, %d, %f, %f, %f, %f, %f, %f, %f, %f, %f, %f, %f, %f, %f, %f", nreject, nwcs, wcs->naxis, wcs->altlin, wcs->crpix[0], wcs->crpix[1], wcs->crval[0], wcs->crval[1], wcs->pv[0], wcs->pv[1], wcs->pv[2], wcs->pv[3], wcs->pc[0], wcs->pc[1], wcs->pc[2], wcs->pc[3], wcs->cdelt[0], wcs->cdelt[1]);

	if (retCode || nwcs < 1 || wcs->naxis != 2)
		return NULL;

	return wcs;
}

int hasCelestial(struct wcsprm *wcs) {
	// printf("LNG LAT %d %d %d %d", wcs->lng, wcs->lat, wcs->types[0], wcs->types[1]);
	return wcs->lng >= 0 && wcs->lat >= 0 ? 1 : 0;
}

int pix2sky(struct wcsprm *wcs, double x, double y, double *world)
{
	double imgcrd[2], phi[2], theta[2];
	int status[1];
	double pixcrd[2] = {x, y};

	wcsp2s(wcs, 1, 2, pixcrd, imgcrd, phi, theta, world, status);
	return status[0];
}

int sky2pix(struct wcsprm *wcs, double ra, double dec, double *pixcrd)
{
	double imgcrd[2], phi[2], theta[2];
	int status[1];
	double world[2] = {ra, dec};

	wcss2p(wcs, 1, 2, world, phi, theta, imgcrd, pixcrd, status);
	return status[0];
}
