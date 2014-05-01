#include "stdio.h"
#include "zp.h"
int main() {
    ZPNumContext ctx(-1256, 1256);
    FILE * fin = fopen("input.txt", "r");
    FILE * fout = fopen("out.bin", "w");
    char c = ' ';
    ZPEncoder zp(fout);
    while ((c = fgetc(fin)) && c != EOF) {
        zp.encode(c, ctx);
    }
    fclose(fin);
    fclose(fout);


    printf("decoding..........\n");
    ZPNumContext ctx1(-1256, 1256);
    fout = fopen("input.txt", "r");
    fin = fopen("out.bin", "r");
    c = ' ';
    fseek(fout, 0L, SEEK_END);
    int sz = ftell(fout);
    fseek(fout, 0L, SEEK_SET);
    printf("size: %d\n", sz);
    ZPDecoder zp1(fin, sz);
    char ans[1000];
    int j = 0;
    for (int i = 0; i < sz - 2; ++i) {
        ans[j++] = zp1.decode(ctx1);
    }
    ans[j] = '\0';
    printf("\n");
    printf("%s", ans);
    fclose(fin);

    return 0;
}
