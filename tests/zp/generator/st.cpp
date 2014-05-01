#include <stdio.h>

int main() {
    int c = ((34774 << 1) | ((1992722703 >> 31) & (1 << 1) - 1)) % 65536;
    printf("%d", c);
}
